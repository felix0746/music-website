import { Client } from '@line/bot-sdk'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
})

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
    await prisma.$disconnect()
  }
}

async function handleTextMessage(event) {
  const { replyToken, source, message } = event
  const userId = source.userId
  const userMessage = message.text.trim()

  try {
    // 檢查用戶是否已經報名
    const existingUser = await prisma.user.findUnique({
      where: { lineUserId: userId }
    })

    if (existingUser) {
      // 如果已經報名，處理付款回報
      if (userMessage.includes('付款') || userMessage.includes('匯款') || userMessage.includes('後五碼')) {
        await handlePaymentReport(userId, userMessage, replyToken)
      } else {
        // 發送一般回覆
        await lineClient.replyMessage(replyToken, {
          type: 'text',
          text: '您好！如果您已完成付款，請回覆「姓名」與「帳號後五碼」給我們確認。'
        })
      }
    } else {
      // 新用戶，引導報名流程
      await handleNewUser(userId, userMessage, replyToken)
    }
  } catch (error) {
    console.error('處理訊息時發生錯誤:', error)
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: '抱歉，系統暫時無法處理您的訊息，請稍後再試。'
    })
  }
}

async function handleNewUser(userId, message, replyToken) {
  // 檢查是否包含報名資訊
  if (message.includes('報名') || message.includes('課程')) {
    // 引導用戶填寫報名資訊
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: `🎵 歡迎報名我們的音樂課程！

請按照以下格式提供您的資訊：

姓名：[您的姓名]
課程：[歌唱課/吉他課/創作課/春曲創作團班]

例如：
姓名：張小明
課程：歌唱課

我們會立即為您處理報名並發送付款資訊！`
    })
  } else if (message.includes('姓名：') && message.includes('課程：')) {
    // 解析報名資訊
    const nameMatch = message.match(/姓名：([^\n]+)/)
    const courseMatch = message.match(/課程：([^\n]+)/)
    
    if (nameMatch && courseMatch) {
      const name = nameMatch[1].trim()
      const course = courseMatch[1].trim()
      
      // 調用報名 API
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/line-enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: userId,
          name: name,
          course: course.toLowerCase()
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        await lineClient.replyMessage(replyToken, {
          type: 'text',
          text: `✅ 報名成功！付款資訊已發送給您，請查看上方訊息。`
        })
      } else {
        await lineClient.replyMessage(replyToken, {
          type: 'text',
          text: `❌ 報名失敗：${result.error}`
        })
      }
    } else {
      await lineClient.replyMessage(replyToken, {
        type: 'text',
        text: `請按照正確格式提供資訊：

姓名：[您的姓名]
課程：[歌唱課/吉他課/創作課/春曲創作團班]`
      })
    }
  } else {
    // 一般歡迎訊息
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: `🎵 歡迎來到 MyMusic 音樂課程！

我們提供以下課程：
• 歌唱課 - 學習如何愛上自己的歌聲
• 吉他課 - 從基礎到進階，養成寫作好習慣
• 創作課 - 探索音樂創作的奧秘
• 春曲創作團班 - 與同好交流，一起把創作帶上舞台

如需報名，請回覆「報名」開始流程！`
    })
  }
}

async function handlePaymentReport(userId, message, replyToken) {
  // 更新用戶付款狀態
  await prisma.user.update({
    where: { lineUserId: userId },
    data: { 
      paymentStatus: 'PAID',
      // 可以在這裡添加付款確認時間等資訊
    }
  })

  await lineClient.replyMessage(replyToken, {
    type: 'text',
    text: `✅ 付款資訊已收到！

我們會盡快確認您的付款，並在 24 小時內與您聯繫安排課程。

感謝您的報名，祝您學習愉快！🎵`
  })
}
