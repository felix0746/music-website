import { Client } from '@line/bot-sdk'
import { PrismaClient } from '@prisma/client'

let prisma
let lineClient

// 延遲初始化，避免 Vercel 冷啟動問題
function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

function getLineClient() {
  if (!lineClient) {
    lineClient = new Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
    })
  }
  return lineClient
}

// 安全回覆訊息函數，處理 replyToken 錯誤
async function safeReplyMessage(lineClient, replyToken, text) {
  try {
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: text
    })
  } catch (error) {
    console.error('回覆訊息失敗:', error.message)
    // 如果回覆失敗，使用 pushMessage 作為備選
    try {
      const userId = replyToken.split('_')[0] // 從 replyToken 提取 userId（這是一個簡化的方法）
      await lineClient.pushMessage(userId, {
        type: 'text',
        text: text
      })
    } catch (pushError) {
      console.error('Push 訊息也失敗:', pushError.message)
    }
  }
}

export async function POST(request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-line-signature')
    
    // 驗證 LINE 簽名（在生產環境中應該要驗證）
    // const crypto = require('crypto')
    // const hash = crypto.createHmac('sha256', process.env.LINE_CHANNEL_SECRET).update(body).digest('base64')
    // if (hash !== signature) {
    //   return Response.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    const events = JSON.parse(body).events

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        await handleTextMessage(event)
      }
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('LINE Webhook 錯誤:', error)
    return Response.json({ error: 'Webhook 處理失敗' }, { status: 500 })
  } finally {
    const prismaInstance = getPrisma()
    await prismaInstance.$disconnect()
  }
}

async function handleTextMessage(event) {
  const { replyToken, source, message } = event
  const userId = source.userId
  const userMessage = message.text.trim()

  try {
    const prismaInstance = getPrisma()
    const lineClientInstance = getLineClient()
    
    // 檢查用戶是否已經報名
    const existingUser = await prismaInstance.user.findUnique({
      where: { lineUserId: userId }
    })

    if (existingUser) {
      // 如果已經報名，處理付款回報
      if (userMessage.includes('付款') || userMessage.includes('匯款') || userMessage.includes('後五碼')) {
        await handlePaymentReport(userId, userMessage, replyToken)
      } else {
        // 發送一般回覆
        await safeReplyMessage(lineClientInstance, replyToken, '您好！如果您已完成付款，請回覆「姓名」與「帳號後五碼」給我們確認。')
      }
    } else {
      // 新用戶，引導報名流程
      await handleNewUser(userId, userMessage, replyToken)
    }
  } catch (error) {
    console.error('處理訊息時發生錯誤:', error)
    const lineClientInstance = getLineClient()
    await safeReplyMessage(lineClientInstance, replyToken, '抱歉，系統暫時無法處理您的訊息，請稍後再試。')
  }
}

async function handleNewUser(userId, message, replyToken) {
  const lineClientInstance = getLineClient()
  
  // 先檢查是否包含完整的報名資訊格式
  if ((message.includes('姓名：') || message.includes('姓名:')) && (message.includes('課程：') || message.includes('課程:'))) {
    // 解析報名資訊，支援中文和英文冒號
    const nameMatch = message.match(/姓名[：:]\s*([^\s課程]+)/)
    const courseMatch = message.match(/課程[：:]\s*([^\s]+)/)
    
    if (nameMatch && courseMatch) {
      const name = nameMatch[1].trim()
      const course = courseMatch[1].trim()
      
      // 直接調用報名邏輯，避免 fetch 問題
      try {
        const prismaInstance = getPrisma()
        const lineClientInstance = getLineClient()

        // 檢查是否已經報名過
        const existingUser = await prismaInstance.user.findUnique({
          where: { lineUserId: userId }
        })

        if (existingUser) {
          await safeReplyMessage(lineClientInstance, replyToken, '您已經報名過了！')
          await prismaInstance.$disconnect()
          return
        }

        // 課程名稱對應
        const courseNames = {
          'singing': '歌唱課',
          'guitar': '吉他課',
          'songwriting': '創作課',
          'band-workshop': '春曲創作團班'
        }

        const courseName = courseNames[course.toLowerCase()] || course

        // 創建新用戶記錄
        const newUser = await prismaInstance.user.create({
          data: {
            lineUserId: userId,
            name: name,
            course: course.toLowerCase(),
            enrollmentDate: new Date(),
            isVerified: true,
            welcomeMessageSent: true
          }
        })

        // 課程價格設定
        const coursePrices = {
          '歌唱課': 'NT$ 3,000',
          '吉他課': 'NT$ 4,000', 
          '創作課': 'NT$ 5,000',
          '春曲創作團班': 'NT$ 6,000'
        }

        const coursePrice = coursePrices[courseName] || 'NT$ 3,000'

        // 發送付款資訊給學員
        const paymentMessage = {
          type: 'text',
          text: `🎵 感謝 ${name} 報名「${courseName}」！

以下是您的付款資訊：

🏦 銀行：台灣銀行 (004)
💳 帳號：1234567890123456
👤 戶名：張文紹
💰 金額：${coursePrice}

📝 重要提醒：
• 請於 3 天內完成付款
• 付款完成後，請回覆「姓名」與「帳號後五碼」
• 我們會在確認付款後 24 小時內與您聯繫

如有任何問題，請隨時與我們聯繫！
祝您學習愉快！😊`
        }

        await lineClientInstance.pushMessage(userId, paymentMessage)

        await safeReplyMessage(lineClientInstance, replyToken, `✅ 報名成功！付款資訊已發送給您，請查看上方訊息。`)

        await prismaInstance.$disconnect()
        
      } catch (error) {
        console.error('報名處理錯誤:', error)
        const lineClientInstance = getLineClient()
        await safeReplyMessage(lineClientInstance, replyToken, `❌ 報名失敗：${error.message}`)
      }
    } else {
      await safeReplyMessage(lineClientInstance, replyToken, `請按照正確格式提供資訊：

姓名：[您的姓名]
課程：[歌唱課/吉他課/創作課/春曲創作團班]`)
    }
  } else if (message.includes('報名') || message.includes('課程')) {
    // 引導用戶填寫報名資訊
    await safeReplyMessage(lineClientInstance, replyToken, `🎵 歡迎報名我們的音樂課程！

請按照以下格式提供您的資訊：

姓名：[您的姓名]
課程：[歌唱課/吉他課/創作課/春曲創作團班]

例如：
姓名：張小明
課程：歌唱課

我們會立即為您處理報名並發送付款資訊！`)
  } else {
    // 一般歡迎訊息
    await safeReplyMessage(lineClientInstance, replyToken, `🎵 歡迎來到 MyMusic 音樂課程！

我們提供以下課程：
• 歌唱課 - 學習如何愛上自己的歌聲
• 吉他課 - 從基礎到進階，養成寫作好習慣
• 創作課 - 探索音樂創作的奧秘
• 春曲創作團班 - 與同好交流，一起把創作帶上舞台

如需報名，請回覆「報名」開始流程！`)
  }
}

async function handlePaymentReport(userId, message, replyToken) {
  const prismaInstance = getPrisma()
  const lineClientInstance = getLineClient()
  
  // 解析付款回報資訊
  const paymentInfo = parsePaymentMessage(message)
  
  // 更新用戶付款狀態和詳細資訊
  await prismaInstance.user.update({
    where: { lineUserId: userId },
    data: { 
      paymentStatus: 'PAID',
      paymentReference: paymentInfo.reference,
      paymentAmount: paymentInfo.amount,
      paymentMethod: paymentInfo.method,
      paymentDate: new Date(),
      paymentNotes: paymentInfo.notes
    }
  })

  await safeReplyMessage(lineClientInstance, replyToken, `✅ 付款資訊已收到！

我們會盡快確認您的付款，並在 24 小時內與您聯繫安排課程。

感謝您的報名，祝您學習愉快！🎵`)
}

// 解析付款回報訊息的函數
function parsePaymentMessage(message) {
  const result = {
    reference: null,
    amount: null,
    method: '銀行轉帳',
    notes: message
  }
  
  // 提取後五碼
  const referenceMatch = message.match(/(\d{5})/)
  if (referenceMatch) {
    result.reference = referenceMatch[1]
  }
  
  // 提取金額
  const amountMatch = message.match(/(\d{1,3}(?:,\d{3})*)/)
  if (amountMatch) {
    result.amount = amountMatch[1]
  }
  
  return result
}
