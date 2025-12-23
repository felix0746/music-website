import { Client } from '@line/bot-sdk'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import {
  getCourseName,
  getCoursePrice,
  calculateShortAmount,
  parseAmount,
  getCoursePriceNumber,
  createCoursesCarousel,
  createPaymentInfoTemplate,
  createPaymentReportTemplate,
  createCancelCourseTemplate,
  createRefundStatusTemplate,
  createCourseQuickReply,
  createCancelReasonQuickReply,
  createRefundRequestQuickReply,
  createCourseDetailTemplate,
  createBankSelectionQuickReply
} from '@/lib/lineHelpers'

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
async function safeReplyMessage(lineClient, replyToken, message, userId = null) {
  // 如果 message 是字串，轉換為文字訊息物件
  const messageObj = typeof message === 'string' 
    ? { type: 'text', text: message }
    : message
  
  // LINE SDK 要求 messages 必須是數組
  const messages = Array.isArray(messageObj) ? messageObj : [messageObj]
  
  // 如果有 replyToken，優先使用 replyMessage
  if (replyToken) {
    try {
      await lineClient.replyMessage(replyToken, messages)
      return
    } catch (error) {
      console.error('回覆訊息失敗:', error.message)
      console.error('回覆訊息錯誤詳情:', error.stack)
      // 如果回覆失敗，且有用戶 ID，使用 pushMessage 作為備選
      if (userId) {
        try {
          await lineClient.pushMessage(userId, messages)
          return
        } catch (pushError) {
          console.error('Push 訊息也失敗:', pushError.message)
          console.error('Push 訊息錯誤詳情:', pushError.stack)
        }
      }
    }
  }
  
  // 如果沒有 replyToken 但有用戶 ID，使用 pushMessage
  if (userId) {
    try {
      await lineClient.pushMessage(userId, messages)
    } catch (pushError) {
      console.error('Push 訊息失敗:', pushError.message)
      console.error('Push 訊息錯誤詳情:', pushError.stack)
    }
  }
}

export async function POST(request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-line-signature')
    
    // 驗證 LINE 簽名（在生產環境中應該要驗證）
    if (process.env.NODE_ENV === 'production' && process.env.LINE_CHANNEL_SECRET) {
      const hash = crypto
        .createHmac('sha256', process.env.LINE_CHANNEL_SECRET)
        .update(body)
        .digest('base64')
      
      if (hash !== signature) {
        console.error('LINE Webhook 簽名驗證失敗')
        return Response.json(
          { error: 'Invalid signature' }, 
          { status: 401 }
        )
      }
    }

    const events = JSON.parse(body).events

    for (const event of events) {
      // 處理文字訊息
      if (event.type === 'message' && event.message.type === 'text') {
        await handleTextMessage(event)
      }
      // 處理 Postback 事件（Rich Menu 和按鈕點擊）
      else if (event.type === 'postback') {
        await handlePostback(event)
      }
      // 處理用戶加入好友事件
      else if (event.type === 'follow') {
        await handleFollow(event)
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
      // 如果已經報名，檢查用戶意圖
      
      // 優先檢查：如果用戶輸入純文字（看起來像姓名），且有保存的課程選擇，直接處理報名
      // 這通常是因為用戶從「立即報名」引導中直接輸入姓名（例如「Felix」）
      if (existingUser.paymentNotes && existingUser.paymentNotes.includes('[PENDING_COURSE]')) {
        // 檢查輸入是否為純文字（不包含特殊關鍵字），且長度合理（可能是姓名）
        const isPlainText = !userMessage.includes('姓名：') && !userMessage.includes('姓名:') && 
                            !userMessage.includes('課程：') && !userMessage.includes('課程:') &&
                            !userMessage.includes('付款') && !userMessage.includes('取消') && 
                            !userMessage.includes('報名') && !userMessage.includes('課程介紹') &&
                            userMessage.length > 0 && userMessage.length < 50 // 合理姓名長度
        
        if (isPlainText) {
          // 提取保存的課程代碼
          const match = existingUser.paymentNotes.match(/\[PENDING_COURSE\]([a-z0-9-]+)/i)
          if (match && match[1]) {
            const pendingCourseCode = match[1].trim()
            const courseName = getCourseName(pendingCourseCode)
            // 將用戶輸入視為姓名，構建報名訊息
            const enrollmentMessage = `姓名：${userMessage}\n課程：${courseName}`
            await handleReEnrollment(userId, enrollmentMessage, replyToken)
            return
          }
        }
      }
      
      // 優先檢查是否為取消課程格式（包含取消原因和退費需求）
      if ((userMessage.includes('姓名：') || userMessage.includes('姓名:')) && 
          (userMessage.includes('課程：') || userMessage.includes('課程:')) &&
          (userMessage.includes('取消原因：') || userMessage.includes('取消原因:')) &&
          (userMessage.includes('退費需求：') || userMessage.includes('退費需求:'))) {
        // 用戶想要取消課程
        await handleCancellation(userId, userMessage, replyToken)
      } else if ((userMessage.includes('姓名：') || userMessage.includes('姓名:')) && (userMessage.includes('課程：') || userMessage.includes('課程:'))) {
        // 用戶提供了完整報名資訊（姓名和課程），處理重新報名
        await handleReEnrollment(userId, userMessage, replyToken)
      } else if ((userMessage.includes('姓名：') || userMessage.includes('姓名:')) && !userMessage.includes('課程：') && !userMessage.includes('課程:')) {
        // 用戶只提供了姓名（沒有課程），檢查是否有保存的課程選擇
        // 這通常是因為他們從「立即報名」按鈕來，課程資訊應該從 paymentNotes 中獲取
        const nameMatch = userMessage.match(/姓名[：:]\s*(.+)/)
        if (nameMatch && existingUser) {
          const name = nameMatch[1].trim()
          
          // 檢查 paymentNotes 中是否有保存的課程選擇（格式：[PENDING_COURSE]課程代碼）
          let pendingCourseCode = null
          if (existingUser.paymentNotes && existingUser.paymentNotes.includes('[PENDING_COURSE]')) {
            // 使用更精確的正則表達式，只提取課程代碼（字母、數字、連字號）
            const match = existingUser.paymentNotes.match(/\[PENDING_COURSE\]([a-z0-9-]+)/i)
            if (match && match[1]) {
              pendingCourseCode = match[1].trim()
            }
          }
          
          // 如果有保存的課程，使用該課程進行報名
          if (pendingCourseCode) {
            const courseName = getCourseName(pendingCourseCode)
            // 構建完整的報名訊息格式
            const enrollmentMessage = `姓名：${name}\n課程：${courseName}`
            await handleReEnrollment(userId, enrollmentMessage, replyToken)
            return
          } else if (existingUser.enrollmentStatus === 'CANCELLED') {
            // 如果沒有保存的課程，但用戶已取消，使用之前的課程
            const courseName = getCourseName(existingUser.course)
            const enrollmentMessage = `姓名：${name}\n課程：${courseName}`
            await handleReEnrollment(userId, enrollmentMessage, replyToken)
            return
          }
        }
        // 如果不符合上述條件，繼續往下處理（可能是新用戶或格式問題）
      } else if (userMessage.includes('付款') || userMessage.includes('匯款') || userMessage.includes('後五碼') || userMessage.includes('銀行：') || userMessage.includes('銀行:')) {
        // 統一使用 handlePaymentReport，它會自動判斷是顯示引導還是處理付款資訊
        // 包括「銀行：xxx」格式，因為這通常是從銀行選擇選單來的
        await handlePaymentReport(userId, userMessage, replyToken)
      } else if (userMessage.includes('報名') || userMessage.includes('新課程') || userMessage.includes('下一季')) {
        // 統一使用 handleNewUser，它會自動判斷是顯示引導還是處理報名
        await handleNewUser(userId, userMessage, replyToken)
      } else if (userMessage.includes('取消原因：') || userMessage.includes('取消原因:')) {
        // 用戶選擇了取消原因（來自 Quick Reply）
        const reasonMatch = userMessage.match(/取消原因[：:]\s*(.+)/)
        if (reasonMatch) {
          const reason = reasonMatch[1].trim()
          await handleCancelReason(userId, replyToken, reason)
        } else {
          await handleCancellation(userId, userMessage, replyToken)
        }
      } else if (userMessage.includes('退費需求：') || userMessage.includes('退費需求:')) {
        // 用戶選擇了退費需求（來自 Quick Reply），需要結合之前的取消原因
        const refundMatch = userMessage.match(/退費需求[：:]\s*(.+)/)
        if (refundMatch) {
          const refundRequest = refundMatch[1].trim()
          await handleRefundRequest(userId, replyToken, refundRequest)
        } else {
          await handleCancellation(userId, userMessage, replyToken)
        }
      } else if (userMessage.includes('取消') || userMessage.includes('退課') || userMessage.includes('退費')) {
        // 用戶想要取消課程
        await handleCancellation(userId, userMessage, replyToken)
      } else if (userMessage.includes('課程介紹') || userMessage.includes('查看其他課程') || userMessage.includes('查看課程')) {
        // 用戶想要查看課程介紹
        await handleShowCourses(userId, replyToken)
      } else if (userMessage === '姓名：' || userMessage === '姓名:' || userMessage.trim() === '姓名：' || userMessage.trim() === '姓名:') {
        // 用戶點擊「查看報名格式」按鈕，顯示報名格式說明
        await safeReplyMessage(lineClientInstance, replyToken, `📝 報名格式說明

請按照以下格式提供您的報名資訊：

💡 格式：
姓名：[您的姓名]

📌 範例：
姓名：張小明

我們收到您的姓名後，會立即為您建立報名記錄並提供付款方式。

如有任何問題，歡迎隨時聯繫我們！`)
      } else if (userMessage.includes('我有問題') || userMessage.includes('我有報名相關問題') || userMessage.includes('問題')) {
        // 用戶有問題，提供幫助
        await safeReplyMessage(lineClientInstance, replyToken, `❓ 我們很樂意為您解答！

請告訴我們您遇到的問題，我們會盡快為您處理。

📱 請使用圖文選單：
• 點擊「課程介紹」查看所有課程並開始報名流程
• 點擊「付款資訊」查看付款方式
• 點擊「付款回報」回報付款資訊
• 點擊「取消/退費」取消課程

📱 或使用 Rich Menu 快速操作：
在聊天室下方，您可以使用圖文選單快速操作。

如有其他問題，請直接告訴我們，我們會盡快回覆您！`)
      } else {
        // 發送一般回覆，根據用戶狀態提供不同選項
        const courseName = getCourseName(existingUser.course)
        let generalMessage = ''
        
        // 如果已取消且已退費，允許重新報名
        if (existingUser.enrollmentStatus === 'CANCELLED' && existingUser.refundStatus === 'COMPLETED') {
          generalMessage = `👋 歡迎回來！

您之前的報名「${courseName}」已取消並完成退費。

如需重新報名，請使用圖文選單：

📱 **Rich Menu（圖文選單）**
在聊天室下方，點擊「課程介紹」查看所有課程並開始報名流程。

❓ 其他問題
如有任何疑問，請直接告訴我們！`
        } else if (existingUser.enrollmentStatus === 'CANCELLED') {
          // 已取消但未退費或退費處理中
          generalMessage = `👋 歡迎回來！

您之前的報名「${courseName}」已取消。

📱 **Rich Menu（圖文選單）**
在聊天室下方，請使用圖文選單：
• 點擊「我的報名」查看完整狀態
• 點擊「取消/退費」查詢退費狀態
• 點擊「課程介紹」查看所有課程

❓ 其他問題
如有任何疑問，請直接告訴我們！`
        } else {
          // 有效報名狀態
          generalMessage = `👋 歡迎回來！

您目前已經報名過「${courseName}」，請選擇您需要的服務：

📱 **Rich Menu（圖文選單）**
在聊天室下方，請使用圖文選單：
• 點擊「我的報名」查看完整狀態
• 點擊「付款資訊」查看付款方式
• 點擊「付款回報」回報付款資訊
• 點擊「取消/退費」取消課程

❓ 其他問題
如有任何疑問，請直接告訴我們！`
        }

        await safeReplyMessage(lineClientInstance, replyToken, generalMessage)
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

        // 如果用戶存在且狀態是 ACTIVE，不允許重複報名
        if (existingUser && existingUser.enrollmentStatus === 'ACTIVE') {
          await safeReplyMessage(lineClientInstance, replyToken, '您已經報名過了！')
          await prismaInstance.$disconnect()
          return
        }
        
        // 如果用戶存在但狀態是 CANCELLED 或 COMPLETED，允許重新報名（會在後面更新記錄）

        // 課程名稱對應
        const courseNames = {
          'singing': '歌唱課',
          'guitar': '吉他課',
          'songwriting': '創作課',
          'band-workshop': '春曲創作團班'
        }

        const courseName = courseNames[course.toLowerCase()] || course

        // 如果用戶已存在（CANCELLED 或 COMPLETED 狀態），更新記錄；否則創建新記錄
        let newUser
        if (existingUser) {
          // 重新報名：更新現有記錄
          newUser = await prismaInstance.user.update({
            where: { lineUserId: userId },
            data: {
              name: name,
              course: course.toLowerCase(),
              enrollmentDate: new Date(),
              enrollmentStatus: 'ACTIVE',
              paymentStatus: 'UNPAID',
              paymentAmount: null,
              paymentBank: null,
              paymentReference: null,
              paymentMethod: null,
              paymentDate: null,
              paymentNotes: null,
              cancellationDate: null,
              cancellationReason: null,
              refundStatus: 'NONE',
              refundAmount: null,
              refundDate: null,
              isVerified: true,
              welcomeMessageSent: true
            }
          })
        } else {
          // 創建新用戶記錄
          newUser = await prismaInstance.user.create({
            data: {
              lineUserId: userId,
              name: name,
              course: course.toLowerCase(),
              enrollmentDate: new Date(),
              isVerified: true,
              welcomeMessageSent: true
            }
          })
        }

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
👤 戶名：蘇文紹
💰 金額：${coursePrice}

📝 重要提醒：
• 請於 3 天內完成付款
• 付款完成後，請回覆「姓名」、「銀行」與「帳號後五碼」
• 我們會在確認付款後 24 小時內與您聯繫

💳 付款回報格式
請按照以下格式提供您的付款資訊：

姓名: [您的姓名]
銀行: [匯款銀行名稱]
後五碼: [帳號後五碼]
金額: [匯款金額]
備註: [其他說明, 選填]

常見銀行：
• 台灣銀行、土地銀行、合作金庫、第一銀行、華南銀行
• 彰化銀行、上海銀行、富邦銀行、國泰世華、中國信託
• 台新銀行、玉山銀行、元大銀行、永豐銀行、兆豐銀行
• 郵局、其他

例如:
姓名: 張小明
銀行: 台新銀行
後五碼: 12345
金額: 3000
備註: 已匯款完成

我們會立即確認您的付款！

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
  } else if (message.includes('課程介紹') || message.includes('查看其他課程') || message.includes('查看課程')) {
    // 用戶想要查看課程介紹
    await handleShowCourses(userId, replyToken)
  } else if (message === '姓名：' || message === '姓名:' || message.trim() === '姓名：' || message.trim() === '姓名:') {
    // 用戶點擊「查看報名格式」按鈕，顯示報名格式說明
    await safeReplyMessage(lineClientInstance, replyToken, `📝 報名格式說明

請按照以下格式提供您的報名資訊：

💡 格式：
姓名：[您的姓名]

📌 範例：
姓名：張小明

我們收到您的姓名後，會立即為您建立報名記錄並提供付款方式。

如有任何問題，歡迎隨時聯繫我們！`)
  } else if (message.includes('我有問題') || message.includes('我有報名相關問題') || message.includes('問題')) {
    // 用戶有問題，提供幫助
    await safeReplyMessage(lineClientInstance, replyToken, `❓ 我們很樂意為您解答！

請告訴我們您遇到的問題，我們會盡快為您處理。

📱 **Rich Menu（圖文選單）**
在聊天室下方，請使用圖文選單：
• 點擊「課程介紹」查看所有課程
• 點擊「付款資訊」查看付款方式
• 點擊「付款回報」回報付款資訊
• 點擊「取消/退費」取消課程
• 點擊「聯絡老師」聯繫我們

如有其他問題，請直接告訴我們，我們會盡快回覆您！`)
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
    // 一般歡迎訊息（與 handleFollow 中的新用戶歡迎訊息保持一致）
    const welcomeMessage = `🎵 歡迎來到 MyMusic 音樂課程！

感謝您加入我們的音樂課程 Bot！

📱 **Rich Menu（圖文選單）**
在聊天室下方，您會看到一個圖文選單，包含以下功能：

🎵 **課程介紹** - 查看所有課程詳細資訊
📋 **我的報名** - 查詢您的報名狀態
💳 **付款資訊** - 查看付款方式
✅ **付款回報** - 回報您的付款資訊
❌ **取消/退費** - 取消課程或查詢退費
💬 **聯絡老師** - 聯繫我們

💡 **快速開始**
點擊「課程介紹」查看所有課程並開始報名流程

我們會盡快為您服務！`

    await safeReplyMessage(lineClientInstance, replyToken, welcomeMessage)
    
    // 發送課程介紹卡片
    try {
      const carousel = createCoursesCarousel()
      await lineClientInstance.pushMessage(userId, carousel)
    } catch (error) {
      console.error('發送課程介紹卡片失敗:', error)
    }
  }
}

// 統一的付款回報處理函數（支援文字輸入和 Rich Menu）
async function handlePaymentReport(userId, message, replyToken) {
  const prismaInstance = getPrisma()
  const lineClientInstance = getLineClient()
  
  // 獲取用戶資訊
  const user = await prismaInstance.user.findUnique({
    where: { lineUserId: userId }
  })
  
  if (!user) {
    await safeReplyMessage(lineClientInstance, replyToken, '❌ 找不到您的報名記錄，請先完成報名。')
    return
  }

  // 解析付款回報資訊（先解析看看有什麼資訊）
  const paymentInfo = parsePaymentMessage(message)
  
  // 檢查是否有銀行資訊但沒有後五碼和金額（用戶剛選擇了銀行）
  const hasBankOnly = paymentInfo.bank && !paymentInfo.reference && !paymentInfo.amount
  
  if (hasBankOnly) {
    // 用戶只選擇了銀行，保存銀行資訊並顯示下一步引導
    await prismaInstance.user.update({
      where: { lineUserId: userId },
      data: {
        paymentNotes: `[PENDING_BANK]${paymentInfo.bank}`
      }
    })
    
    const coursePrice = getCoursePrice(user.course)
    const nextStepMessage = `✅ 已選擇銀行：${paymentInfo.bank}

請繼續提供以下資訊：

• 後五碼：[帳號後五碼]
• 金額：${coursePrice}

例如：
後五碼: 12345
金額: ${coursePrice.replace(/[^\d]/g, '')}
備註: 已匯款完成（選填）

我們會立即確認您的付款！`
    
    await safeReplyMessage(lineClientInstance, replyToken, nextStepMessage)
    return
  }
  
  // 檢查是否有保存的銀行資訊（從 paymentNotes 中讀取）
  let savedBank = null
  if (user.paymentNotes && user.paymentNotes.includes('[PENDING_BANK]')) {
    const match = user.paymentNotes.match(/\[PENDING_BANK\](.+)/)
    if (match && match[1]) {
      savedBank = match[1].trim()
      // 如果解析出的銀行資訊為空，使用保存的銀行
      if (!paymentInfo.bank) {
        paymentInfo.bank = savedBank
      }
    }
  }
  
  // 檢查訊息是否包含付款資訊（後五碼、金額為必需）
  // 判斷條件：需要後五碼（或5位數字）AND 金額（或3位以上數字）
  const hasPaymentInfo = message && (
    (message.includes('後五碼') || message.includes('後5碼') || /\d{5}/.test(message)) &&
    (message.includes('金額') || /\d{3,}/.test(message))
  )

  // 如果只是關鍵字（如「付款」、「匯款」）而沒有實際付款資訊，先檢查付款狀態
  if (!hasPaymentInfo && (message === '付款' || message === '匯款' || message.includes('付款回報') || message.trim().length < 10)) {
    // 檢查付款狀態，如果已經付款完成，顯示確認訊息而非引導
    if (user.paymentStatus === 'PAID') {
      const paidMessage = `✅ 付款確認完成

您已完成付款，以下是您的付款資訊：

${user.paymentBank ? `🏦 銀行：${user.paymentBank}\n` : ''}${user.paymentReference ? `💳 後五碼：${user.paymentReference}\n` : ''}${user.paymentAmount ? `💰 金額：${user.paymentAmount}\n` : ''}${user.paymentDate ? `📅 付款日期：${new Date(user.paymentDate).toLocaleDateString('zh-TW')}\n` : ''}
📚 課程：${getCourseName(user.course)}
💰 應付金額：${getCoursePrice(user.course)}

✅ 您的付款已確認，我們會盡快與您聯繫安排課程！

如有任何問題，請點擊「聯絡老師」聯繫我們。`
      await safeReplyMessage(lineClientInstance, replyToken, paidMessage)
      return
    } else if (user.paymentStatus === 'PARTIAL') {
      // 部分付款的情況
      const shortAmount = calculateShortAmount(user)
      const partialMessage = `⚠️ 部分付款狀態

您目前的付款狀況：

${user.paymentBank ? `🏦 銀行：${user.paymentBank}\n` : ''}${user.paymentReference ? `💳 後五碼：${user.paymentReference}\n` : ''}${user.paymentAmount ? `💰 已付款金額：${user.paymentAmount}\n` : ''}
📚 課程：${getCourseName(user.course)}
💰 應付金額：${getCoursePrice(user.course)}
⚠️ 尚需補付：${shortAmount} 元

請完成補付以確認報名。

如需補付，請點擊「付款回報」並提供補付資訊。`
      await safeReplyMessage(lineClientInstance, replyToken, partialMessage)
      return
    }
    // 未付款或狀態不明，顯示付款回報引導
    await showPaymentReportGuide(userId, replyToken, user)
    return
  }
  
  // 如果解析後沒有關鍵資訊（後五碼和金額），也先檢查付款狀態
  if (!paymentInfo.reference && !paymentInfo.amount) {
    // 檢查付款狀態
    if (user.paymentStatus === 'PAID') {
      const paidMessage = `✅ 付款確認完成

您已完成付款，以下是您的付款資訊：

${user.paymentBank ? `🏦 銀行：${user.paymentBank}\n` : ''}${user.paymentReference ? `💳 後五碼：${user.paymentReference}\n` : ''}${user.paymentAmount ? `💰 金額：${user.paymentAmount}\n` : ''}${user.paymentDate ? `📅 付款日期：${new Date(user.paymentDate).toLocaleDateString('zh-TW')}\n` : ''}
📚 課程：${getCourseName(user.course)}
💰 應付金額：${getCoursePrice(user.course)}

✅ 您的付款已確認，我們會盡快與您聯繫安排課程！

如有任何問題，請點擊「聯絡老師」聯繫我們。`
      await safeReplyMessage(lineClientInstance, replyToken, paidMessage)
      return
    } else if (user.paymentStatus === 'PARTIAL') {
      // 部分付款的情況
      const shortAmount = calculateShortAmount(user)
      const partialMessage = `⚠️ 部分付款狀態

您目前的付款狀況：

${user.paymentBank ? `🏦 銀行：${user.paymentBank}\n` : ''}${user.paymentReference ? `💳 後五碼：${user.paymentReference}\n` : ''}${user.paymentAmount ? `💰 已付款金額：${user.paymentAmount}\n` : ''}
📚 課程：${getCourseName(user.course)}
💰 應付金額：${getCoursePrice(user.course)}
⚠️ 尚需補付：${shortAmount} 元

請完成補付以確認報名。

如需補付，請點擊「付款回報」並提供補付資訊。`
      await safeReplyMessage(lineClientInstance, replyToken, partialMessage)
      return
    }
    // 未付款或狀態不明，顯示付款回報引導
    await showPaymentReportGuide(userId, replyToken, user)
    return
  }
  
  // 驗證付款金額
  const expectedNumber = getCoursePriceNumber(user.course)
  const expectedPrice = getCoursePrice(user.course)
  const paidNumber = parseAmount(paymentInfo.amount)
  
  let enrollmentStatus = 'ACTIVE'
  let paymentStatus = 'PAID'
  let paymentNotes = paymentInfo.notes || ''
  
  // 檢查是否為補付情況
  const isSupplementPayment = user.paymentStatus === 'PARTIAL'
  
  // 清除臨時銀行標記（如果有的話），用於構建 paymentNotes
  let basePaymentNotes = user.paymentNotes || ''
  if (basePaymentNotes.includes('[PENDING_BANK]')) {
    basePaymentNotes = basePaymentNotes.replace(/\[PENDING_BANK\][^\n]*/g, '').trim()
  }
  
  if (isSupplementPayment) {
    // 補付情況：計算累計金額
    const previousAmount = parseAmount(user.paymentAmount)
    const totalPaid = previousAmount + paidNumber
    
    if (totalPaid < expectedNumber) {
      // 補付後仍不足
      const shortAmount = expectedNumber - totalPaid
      paymentStatus = 'PARTIAL'
      paymentNotes = basePaymentNotes ? `${basePaymentNotes}\n[補付 ${paidNumber} 元，累計 ${totalPaid} 元，尚需補付 ${shortAmount} 元]` : `[補付 ${paidNumber} 元，累計 ${totalPaid} 元，尚需補付 ${shortAmount} 元]`
    } else if (totalPaid === expectedNumber) {
      // 補付完成
      paymentStatus = 'PAID'
      paymentNotes = basePaymentNotes ? `${basePaymentNotes}\n[補付 ${paidNumber} 元，累計 ${totalPaid} 元，付款完成]` : `[補付 ${paidNumber} 元，累計 ${totalPaid} 元，付款完成]`
    } else {
      // 補付過多
      const overAmount = totalPaid - expectedNumber
      paymentStatus = 'PAID'
      paymentNotes = basePaymentNotes ? `${basePaymentNotes}\n[補付 ${paidNumber} 元，累計 ${totalPaid} 元，超額 ${overAmount} 元，將安排退費]` : `[補付 ${paidNumber} 元，累計 ${totalPaid} 元，超額 ${overAmount} 元，將安排退費]`
    }
    
    // 更新付款金額為累計金額
    paymentInfo.amount = totalPaid.toString()
  } else {
    // 一般付款情況
    if (paidNumber < expectedNumber) {
      // 金額不足，標記為部分付款，不取消報名
      const shortAmount = expectedNumber - paidNumber
      paymentStatus = 'PARTIAL'
      paymentNotes = paymentNotes ? 
        `${paymentNotes}\n[系統備註：少付 ${shortAmount} 元，需要補付]` : 
        `[系統備註：少付 ${shortAmount} 元，需要補付]`
    } else if (paidNumber > expectedNumber) {
      // 金額過多，接受付款但記錄超額
      const overAmount = paidNumber - expectedNumber
      paymentNotes = paymentNotes ? 
        `${paymentNotes}\n[系統備註：超額付款 ${overAmount} 元，將安排退費]` : 
        `[系統備註：超額付款 ${overAmount} 元，將安排退費]`
    }
    // 金額正確時，保持預設狀態
  }
  
  // 更新用戶付款狀態和詳細資訊
  // 清除臨時保存的銀行資訊（如果有的話），因為已經保存到 paymentBank 欄位了
  let finalPaymentNotes = paymentNotes
  if (user.paymentNotes && user.paymentNotes.includes('[PENDING_BANK]')) {
    // 清除臨時銀行標記，保留其他備註（如果 paymentNotes 有值）
    // 如果 paymentNotes 原本就是空的，則設為 null
    if (finalPaymentNotes && finalPaymentNotes.includes('[PENDING_BANK]')) {
      finalPaymentNotes = finalPaymentNotes.replace(/\[PENDING_BANK\][^\n]*/g, '').trim() || null
    } else if (!finalPaymentNotes) {
      finalPaymentNotes = null
    }
  }
  
  await prismaInstance.user.update({
    where: { lineUserId: userId },
    data: { 
      paymentStatus: paymentStatus,
      enrollmentStatus: enrollmentStatus,
      paymentReference: paymentInfo.reference,
      paymentAmount: paymentInfo.amount,
      paymentMethod: paymentInfo.method,
      paymentBank: paymentInfo.bank,
      paymentDate: new Date(),
      paymentNotes: finalPaymentNotes,
      cancellationDate: enrollmentStatus === 'CANCELLED' ? new Date() : null,
      cancellationReason: enrollmentStatus === 'CANCELLED' ? '付款金額不足' : null
    }
  })

  // 構建確認訊息
  let confirmMessage = ''
  
  if (paymentStatus === 'PARTIAL') {
    // 部分付款的情況
    // 計算總付款金額（包括之前的付款）
    const previousAmount = parseAmount(user.paymentAmount)
    const totalPaid = previousAmount + paidNumber
    const shortAmount = expectedNumber - totalPaid
    
    confirmMessage = `⚠️ 部分付款已收到！\n\n`
    confirmMessage += `您的付款資訊：\n`
    if (paymentInfo.name) {
      confirmMessage += `姓名：${paymentInfo.name}\n`
    }
    if (paymentInfo.bank) {
      confirmMessage += `銀行：${paymentInfo.bank}\n`
    }
    if (paymentInfo.reference) {
      confirmMessage += `後五碼：${paymentInfo.reference}\n`
    }
    if (paymentInfo.amount) {
      confirmMessage += `金額：${paymentInfo.amount}\n`
    }
    confirmMessage += `\n課程資訊：\n`
    confirmMessage += `課程：${getCourseName(user.course)}\n`
    confirmMessage += `應付金額：${expectedPrice}\n\n`
    confirmMessage += `💰 付款狀況：\n`
    confirmMessage += `• 您已付款：${totalPaid}\n`
    confirmMessage += `• 課程費用：${expectedPrice}\n`
    confirmMessage += `• 尚需補付：${shortAmount} 元\n\n`
    confirmMessage += `📝 補付方式：\n`
    confirmMessage += `請再次匯款 ${shortAmount} 元到以下帳戶：\n`
    confirmMessage += `🏦 銀行：台灣銀行 (004)\n`
    confirmMessage += `💳 帳號：1234567890123456\n`
    confirmMessage += `👤 戶名：蘇文紹\n\n`
    confirmMessage += `補付完成後，請再次回報付款資訊，我們會立即確認您的完整付款！\n\n`
    confirmMessage += `如有疑問，請聯繫客服。`
  } else {
    // 付款成功的情況（包括多付）
    const isOverpaid = paidNumber > expectedNumber
    confirmMessage = `✅ 付款資訊已收到！\n\n`
    if (paymentInfo.name) {
      confirmMessage += `姓名：${paymentInfo.name}\n`
    }
    if (paymentInfo.bank) {
      confirmMessage += `銀行：${paymentInfo.bank}\n`
    }
    if (paymentInfo.reference) {
      confirmMessage += `後五碼：${paymentInfo.reference}\n`
    }
    if (paymentInfo.amount) {
      confirmMessage += `金額：${paymentInfo.amount}\n`
    }
    if (paymentInfo.notes && paymentInfo.notes !== message) {
      confirmMessage += `備註：${paymentInfo.notes}\n`
    }
    confirmMessage += `\n課程資訊：\n`
    confirmMessage += `課程：${getCourseName(user.course)}\n`
    confirmMessage += `應付金額：${expectedPrice}\n\n`
    
    if (isOverpaid) {
      const overAmount = paidNumber - expectedNumber
      confirmMessage += `💰 付款確認：\n`
      confirmMessage += `• 您已付款：${paymentInfo.amount}\n`
      confirmMessage += `• 課程費用：${expectedPrice}\n`
      confirmMessage += `• 超額付款：${overAmount} 元\n\n`
      confirmMessage += `我們會盡快確認您的付款，並在 24 小時內與您聯繫安排課程。\n`
      confirmMessage += `超額付款的部分，我們會在課程開始前退還給您。\n\n`
      confirmMessage += `感謝您的報名，祝您學習愉快！🎵`
    } else {
      confirmMessage += `我們會盡快確認您的付款，並在 24 小時內與您聯繫安排課程。\n\n感謝您的報名，祝您學習愉快！🎵`
    }
  }

  await safeReplyMessage(lineClientInstance, replyToken, confirmMessage)
}

// 常見銀行列表（用於匹配）
const COMMON_BANKS = {
  '台灣銀行': ['台灣銀行', '台銀', '004'],
  '土地銀行': ['土地銀行', '土銀', '005'],
  '合作金庫': ['合作金庫', '合庫', '006'],
  '第一銀行': ['第一銀行', '一銀', '007'],
  '華南銀行': ['華南銀行', '華銀', '008'],
  '彰化銀行': ['彰化銀行', '彰銀', '009'],
  '上海銀行': ['上海銀行', '上銀', '011'],
  '富邦銀行': ['富邦銀行', '富邦', '012'],
  '國泰世華': ['國泰世華', '國泰', '013'],
  '中國信託': ['中國信託', '中信', '822'],
  '台新銀行': ['台新銀行', '台新', '812'],
  '玉山銀行': ['玉山銀行', '玉山', '808'],
  '元大銀行': ['元大銀行', '元大', '806'],
  '永豐銀行': ['永豐銀行', '永豐', '807'],
  '兆豐銀行': ['兆豐銀行', '兆豐', '017'],
  '郵局': ['郵局', '中華郵政', '700'],
  '其他': ['其他']
}

// 匹配銀行名稱的函數
function matchBankName(text) {
  if (!text) return null
  
  const lowerText = text.toLowerCase()
  for (const [bankName, keywords] of Object.entries(COMMON_BANKS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase()) || text.includes(keyword)) {
        return bankName
      }
    }
  }
  return null
}

// 解析付款回報訊息的函數
function parsePaymentMessage(message) {
  const result = {
    reference: null,
    amount: null,
    bank: null,
    method: '銀行轉帳',
    notes: message
  }
  
  // 提取姓名（支援中文和英文冒號）
  const nameMatch = message.match(/姓名[：:]\s*([^\n\r後五碼金額備註銀行]+)/)
  if (nameMatch) {
    result.name = nameMatch[1].trim()
  }
  
  // 提取銀行（支援中文和英文冒號）
  const bankMatch = message.match(/銀行[：:]\s*([^\n\r後五碼金額備註]+)/)
  if (bankMatch) {
    const bankText = bankMatch[1].trim()
    result.bank = matchBankName(bankText) || bankText
  } else {
    // 備用：在整個訊息中搜尋銀行關鍵字
    const matchedBank = matchBankName(message)
    if (matchedBank) {
      result.bank = matchedBank
    }
  }
  
  // 提取後五碼
  const referenceMatch = message.match(/後五碼[：:]\s*(\d{5})/)
  if (referenceMatch) {
    result.reference = referenceMatch[1]
  } else {
    // 備用：直接找5位數字
    const fallbackMatch = message.match(/(\d{5})/)
    if (fallbackMatch) {
      result.reference = fallbackMatch[1]
    }
  }
  
  // 提取金額（支援千分位逗號和純數字）
  const amountMatch = message.match(/金額[：:]\s*(\d+(?:,\d{3})*)/)
  if (amountMatch) {
    result.amount = amountMatch[1]
  } else {
    // 備用：找數字（避免提取到後五碼）
    const fallbackAmountMatch = message.match(/(\d{3,}(?:,\d{3})*)/)
    if (fallbackAmountMatch) {
      result.amount = fallbackAmountMatch[1]
    }
  }
  
  // 提取備註
  const notesMatch = message.match(/備註[：:]\s*([^\n\r]+)/)
  if (notesMatch) {
    result.notes = notesMatch[1].trim()
  }
  
  return result
}

// 處理報名請求的函數（檢查用戶狀態）
async function handleEnrollmentRequest(userId, message, replyToken) {
  const lineClientInstance = getLineClient()
  const prismaInstance = getPrisma()
  
  try {
    // 檢查用戶當前狀態
    const currentUser = await prismaInstance.user.findUnique({
      where: { lineUserId: userId }
    })

    if (!currentUser) {
      await safeReplyMessage(lineClientInstance, replyToken, '❌ 找不到您的記錄，請聯繫客服。')
      return
    }

    // 如果用戶已完成付款，不允許重新報名
    if (currentUser.enrollmentStatus === 'ACTIVE' && currentUser.paymentStatus === 'PAID') {
      await safeReplyMessage(lineClientInstance, replyToken, `您目前已經完成報名並付款！

您的當前報名資訊：
• 姓名：${currentUser.name}
• 課程：${getCourseName(currentUser.course)}
• 付款狀態：已付款 ✅

如果您需要報名新一季課程，請先取消現有報名後再重新報名。

📱 請使用圖文選單：
• 點擊「取消/退費」取消現有報名
• 點擊「課程介紹」查看所有課程
• 點擊「聯絡老師」如有任何疑問`)
      return
    }

    // 如果用戶未完成付款，提醒完成付款
    if (currentUser.enrollmentStatus === 'ACTIVE' && (currentUser.paymentStatus === 'PARTIAL' || currentUser.paymentStatus === 'PENDING' || currentUser.paymentStatus === 'UNPAID')) {
      await safeReplyMessage(lineClientInstance, replyToken, `您目前已經有報名記錄，但付款尚未完成！

您的當前報名資訊：
• 姓名：${currentUser.name}
• 課程：${getCourseName(currentUser.course)}
• 付款狀態：${currentUser.paymentStatus === 'PARTIAL' ? '部分付款' : 
                      currentUser.paymentStatus === 'PENDING' ? '待補付' : '尚未付款'}

📱 請使用圖文選單：
• 點擊「付款回報」完成付款
• 點擊「取消/退費」取消現有報名`)
      return
    }

    // 如果用戶狀態是 CANCELLED 或 COMPLETED，引導重新報名
    await safeReplyMessage(lineClientInstance, replyToken, `🎵 歡迎報名新一季的音樂課程！

📱 請使用圖文選單：
• 點擊「課程介紹」查看所有課程並開始報名流程

我們會為您處理新一季的報名並發送付款資訊！`)

  } catch (error) {
    console.error('處理報名請求時發生錯誤:', error)
    await safeReplyMessage(lineClientInstance, replyToken, '抱歉，系統暫時無法處理您的請求，請稍後再試。')
  } finally {
    await prismaInstance.$disconnect()
  }
}

// 處理重新報名的函數
async function handleReEnrollment(userId, message, replyToken) {
  const lineClientInstance = getLineClient()
  
  // 檢查是否包含報名資訊
  if ((message.includes('姓名：') || message.includes('姓名:')) && (message.includes('課程：') || message.includes('課程:'))) {
    // 解析報名資訊，支援中文和英文冒號
    const nameMatch = message.match(/姓名[：:]([^\n]+)/)
    const courseMatch = message.match(/課程[：:]([^\n]+)/)
    
    if (nameMatch && courseMatch) {
      const name = nameMatch[1].trim()
      const course = courseMatch[1].trim()
      
      // 處理重新報名邏輯
      try {
        const prismaInstance = getPrisma()
        const lineClientInstance = getLineClient()

        // 檢查用戶當前狀態
        const currentUser = await prismaInstance.user.findUnique({
          where: { lineUserId: userId }
        })

        if (!currentUser) {
          await safeReplyMessage(lineClientInstance, replyToken, '❌ 找不到您的記錄，請聯繫客服。')
          await prismaInstance.$disconnect()
          return
        }

        // 檢查是否可以重新報名
        if (currentUser.enrollmentStatus === 'ACTIVE' && currentUser.paymentStatus === 'PAID') {
          await safeReplyMessage(lineClientInstance, replyToken, `您目前已經完成報名並付款！

您的當前報名資訊：
• 姓名：${currentUser.name}
• 課程：${getCourseName(currentUser.course)}
• 付款狀態：已付款 ✅

如果您需要：
• 報名新一季課程：請先取消現有報名
• 更改課程：請先取消現有報名
• 其他問題：請聯繫客服`)
          await prismaInstance.$disconnect()
          return
        } else if (currentUser.enrollmentStatus === 'ACTIVE' && (currentUser.paymentStatus === 'PARTIAL' || currentUser.paymentStatus === 'PENDING' || currentUser.paymentStatus === 'UNPAID')) {
          await safeReplyMessage(lineClientInstance, replyToken, `您目前已經有效報名，但付款尚未完成！

您的當前報名資訊：
• 姓名：${currentUser.name}
• 課程：${getCourseName(currentUser.course)}
• 付款狀態：${currentUser.paymentStatus === 'PARTIAL' ? '部分付款' : 
                      currentUser.paymentStatus === 'PENDING' ? '待補付' : '尚未付款'}

如果您需要：
• 完成付款：請回報付款資訊
• 更改課程：請先取消現有報名
• 其他問題：請聯繫客服`)
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

        // 更新用戶記錄（重新報名）
        const updatedUser = await prismaInstance.user.update({
          where: { lineUserId: userId },
          data: {
            name: name,
            course: course.toLowerCase(),
            enrollmentDate: new Date(),
            enrollmentStatus: 'ACTIVE', // 重置報名狀態
            paymentStatus: 'UNPAID', // 重置付款狀態
            paymentReference: null,
            paymentAmount: null,
            paymentMethod: null,
            paymentDate: null,
            paymentNotes: null,
            // 清除取消和退款相關資訊
            cancellationDate: null,
            cancellationReason: null,
            refundStatus: 'NONE',
            refundAmount: null,
            refundDate: null
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
          text: `🎵 感謝 ${name} 重新報名「${courseName}」！

以下是您的付款資訊：

🏦 銀行：台灣銀行 (004)
💳 帳號：1234567890123456
👤 戶名：蘇文紹
💰 金額：${coursePrice}

📝 重要提醒：
• 請於 3 天內完成付款
• 付款完成後，請回覆「姓名」、「銀行」與「帳號後五碼」
• 我們會在確認付款後 24 小時內與您聯繫

💳 付款回報格式
請按照以下格式提供您的付款資訊：

姓名: [您的姓名]
銀行: [匯款銀行名稱]
後五碼: [帳號後五碼]
金額: [匯款金額]
備註: [其他說明, 選填]

常見銀行：
• 台灣銀行、土地銀行、合作金庫、第一銀行、華南銀行
• 彰化銀行、上海銀行、富邦銀行、國泰世華、中國信託
• 台新銀行、玉山銀行、元大銀行、永豐銀行、兆豐銀行
• 郵局、其他

例如:
姓名: 張小明
銀行: 台新銀行
後五碼: 12345
金額: 3000
備註: 已匯款完成

我們會立即確認您的付款！

如有任何問題，請隨時與我們聯繫！
祝您學習愉快！😊`
        }

        await lineClientInstance.pushMessage(userId, paymentMessage)

        await safeReplyMessage(lineClientInstance, replyToken, `✅ 重新報名成功！付款資訊已發送給您，請查看上方訊息。`)

        await prismaInstance.$disconnect()
        
      } catch (error) {
        console.error('重新報名處理錯誤:', error)
        const lineClientInstance = getLineClient()
        await safeReplyMessage(lineClientInstance, replyToken, `❌ 重新報名失敗：${error.message}`)
      }
    } else {
      await safeReplyMessage(lineClientInstance, replyToken, `請按照正確格式提供資訊：

姓名：[您的姓名]
課程：[歌唱課/吉他課/創作課/春曲創作團班]`)
    }
  } else {
    // 一般重新報名引導（當用戶只輸入「報名」等關鍵字時）
    await safeReplyMessage(lineClientInstance, replyToken, `🎵 歡迎報名新一季的音樂課程！

請按照以下格式提供您的資訊：

姓名：[您的姓名]
課程：[歌唱課/吉他課/創作課/春曲創作團班]

例如：
姓名：張小明
課程：歌唱課

我們會為您處理新一季的報名並發送付款資訊！`)
  }
}

// 統一的取消課程處理函數（支援文字輸入和 Rich Menu）
async function handleCancellation(userId, message, replyToken) {
  const prismaInstance = getPrisma()
  const lineClientInstance = getLineClient()
  
  console.log('處理取消課程，用戶 ID:', userId)
  console.log('取消訊息內容:', message)
  
  // 先獲取用戶資訊
  const user = await prismaInstance.user.findUnique({
    where: { lineUserId: userId }
  })

  if (!user) {
    await safeReplyMessage(lineClientInstance, replyToken, '❌ 找不到您的報名記錄，請先完成報名。')
    return
  }

  // 如果已經取消，顯示退費狀態查詢
  if (user.enrollmentStatus === 'CANCELLED') {
    if (user.refundStatus !== 'NONE') {
      // 有退費記錄，顯示退費狀態
      const template = createRefundStatusTemplate(user)
      await safeReplyMessage(lineClientInstance, replyToken, template, userId)
    } else {
      // 沒有退費記錄
      await safeReplyMessage(lineClientInstance, replyToken, `❌ 您的課程已經取消過了。

目前沒有退費記錄。

📱 如需重新報名，請使用圖文選單：
• 點擊「課程介紹」查看所有課程並開始報名流程。`)
    }
    return
  }

  // 檢查是否包含完整的取消資訊
  const hasFullCancellationInfo = (message.includes('姓名：') || message.includes('姓名:')) && 
      (message.includes('課程：') || message.includes('課程:')) && 
      (message.includes('取消原因：') || message.includes('取消原因:')) && 
      (message.includes('退費需求：') || message.includes('退費需求:'))

  // 如果只是關鍵字（如「取消」、「退費」）而沒有實際取消資訊，顯示引導
  if (!hasFullCancellationInfo && (!message || message.includes('取消') || message.includes('退課') || message.includes('退費') || message.trim().length < 10)) {
    // 顯示取消課程引導（使用 Template Message）
    const template = createCancelCourseTemplate(user)
    await safeReplyMessage(lineClientInstance, replyToken, template, userId)
    return
  }

  if (hasFullCancellationInfo) {
    console.log('✅ 包含完整取消資訊格式')
    // 解析取消資訊
    const lines = message.split(/\n|\r\n|\r/)
    let name = '', course = '', reason = '', refundRequest = ''
    
    for (const line of lines) {
      if (line.includes('姓名')) {
        const match = line.match(/姓名[：:]\s*(.+)/)
        if (match) name = match[1].trim()
      } else if (line.includes('課程')) {
        const match = line.match(/課程[：:]\s*(.+)/)
        if (match) course = match[1].trim()
      } else if (line.includes('取消原因')) {
        const match = line.match(/取消原因[：:]\s*(.+)/)
        if (match) reason = match[1].trim()
      } else if (line.includes('退費需求')) {
        const match = line.match(/退費需求[：:]\s*(.+)/)
        if (match) refundRequest = match[1].trim()
      }
    }
    
    console.log('解析結果:', { name, course, reason, refundRequest })
    
    if (name && course && reason && refundRequest) {
      console.log('✅ 解析成功，開始處理取消邏輯')
      
      // 處理取消邏輯（用戶已在函數開頭檢查過）
      try {
        const lineClientInstance = getLineClient()

        // 驗證姓名和課程是否匹配
        const courseName = getCourseName(user.course)
        if (user.name !== name || courseName !== course) {
          await safeReplyMessage(lineClientInstance, replyToken, `❌ 姓名或課程不匹配！

您的報名記錄：
• 姓名：${user.name}
• 課程：${courseName}

請確認資訊正確後重新提交取消申請。`)
          return
        }

        // 更新用戶狀態
        console.log('更新用戶狀態為 CANCELLED，原因:', reason)
        const updatedUser = await prismaInstance.user.update({
          where: { lineUserId: userId },
          data: {
            enrollmentStatus: 'CANCELLED',
            cancellationDate: new Date(),
            cancellationReason: reason,
            refundStatus: refundRequest === '是' ? 'PENDING' : 'NONE'
          }
        })
        console.log('✅ 用戶狀態更新成功:', updatedUser.enrollmentStatus)

        // 構建回覆訊息
        let replyMessage = `✅ 取消申請已收到！

取消資訊：
• 姓名：${user.name}
• 課程：${getCourseName(user.course)}
• 取消原因：${reason}
• 退費需求：${refundRequest}

`

        if (refundRequest === '是') {
          // 根據付款狀況決定退費政策
          const paidAmount = parseAmount(user.paymentAmount)
          
          // 計算開課前剩餘天數
          let daysUntilCourseStart = null
          if (user.courseStartDate) {
            const courseStartDate = new Date(user.courseStartDate)
            const now = new Date()
            // 計算開課日期 - 今天的日期（以天為單位）
            daysUntilCourseStart = Math.floor((courseStartDate - now) / (1000 * 60 * 60 * 24))
          }
          
          if (user.paymentStatus === 'PAID' || user.paymentStatus === 'PARTIAL') {
            // 有付款（全額或部分），需要退費
            if (paidAmount > 0) {
              // 如果沒有設定開課日期，使用報名日期作為備用計算方式
              if (daysUntilCourseStart === null) {
                const enrollmentDate = new Date(user.enrollmentDate)
                const daysSinceEnrollment = Math.floor((new Date() - enrollmentDate) / (1000 * 60 * 60 * 24))
                // 如果報名後超過 7 天，視為超過 7 天
                daysUntilCourseStart = daysSinceEnrollment <= 7 ? 7 : -1
              }
              
              if (daysUntilCourseStart >= 0 && daysUntilCourseStart <= 7) {
                // 開課前 7 天內取消：全額退還已付金額
                replyMessage += `💰 退費政策：
• 開課前 7 天內取消：全額退費
• 您已付款：${user.paymentAmount || '0'} 元
• 退費金額：${user.paymentAmount || '待確認'}
• 退費將在 3-5 個工作天內處理完成

我們會盡快為您處理退費事宜！`
              } else {
                // 開課前超過 7 天或已開課：部分退費（50%）
                const refundAmount = Math.floor(paidAmount * 0.5)
                replyMessage += `💰 退費政策：
• 開課前 7 天後取消：部分退費（50%）
• 您已付款：${user.paymentAmount || '0'} 元
• 退費金額：${refundAmount} 元
• 退費將在 3-5 個工作天內處理完成

我們會盡快為您處理退費事宜！`
              }
            } else {
              // 雖然狀態是 PAID 或 PARTIAL，但實際付款金額為 0
              replyMessage += `💰 退費政策：
• 您尚未完成付款，無需退費
• 課程已成功取消

感謝您的理解！`
            }
          } else {
            // 未付款（UNPAID 或 PENDING）
            replyMessage += `💰 退費政策：
• 您尚未完成付款，無需退費
• 課程已成功取消

感謝您的理解！`
          }
        } else {
          replyMessage += `課程已成功取消，感謝您的理解！`
        }

        await safeReplyMessage(lineClientInstance, replyToken, replyMessage)

        await prismaInstance.$disconnect()
        
      } catch (error) {
        console.error('取消課程處理錯誤:', error)
        const lineClientInstance = getLineClient()
        await safeReplyMessage(lineClientInstance, replyToken, `❌ 取消課程失敗：${error.message}`)
      }
    } else {
      await safeReplyMessage(lineClientInstance, replyToken, `請按照正確格式提供資訊：

姓名：[您的姓名]
課程：[課程名稱]
取消原因：[請簡述取消原因]
退費需求：[是/否]

例如：
姓名：張小明
課程：歌唱課
取消原因：工作時間變更，無法配合上課時間
退費需求：是`)
    }
  } else if (message.includes('取消') || message.includes('退課') || message.includes('退費')) {
    // 引導用戶提供取消資訊
    await safeReplyMessage(lineClientInstance, replyToken, `❌ 取消課程申請

我們很遺憾聽到您想要取消課程。為了確保安全，請提供以下資訊：

姓名：[您的姓名]
課程：[課程名稱]
取消原因：[請簡述取消原因]
退費需求：[是/否]

例如：
姓名：張小明
課程：歌唱課
取消原因：工作時間變更，無法配合上課時間
退費需求：是

我們會根據您的付款狀況和取消時間來處理退費事宜。`)
  } else {
    // 一般取消引導
    await safeReplyMessage(lineClientInstance, replyToken, `❌ 取消課程申請

我們很遺憾聽到您想要取消課程。為了確保安全，請提供以下資訊：

姓名：[您的姓名]
課程：[課程名稱]
取消原因：[請簡述取消原因]
退費需求：[是/否]

例如：
姓名：張小明
課程：歌唱課
取消原因：工作時間變更，無法配合上課時間
退費需求：是

我們會根據您的付款狀況和取消時間來處理退費事宜。`)
  }
}

// 處理 Postback 事件（Rich Menu 和按鈕點擊）
async function handlePostback(event) {
  const { replyToken, source, postback } = event
  const userId = source.userId
  const data = postback.data

  try {
    const prismaInstance = getPrisma()
    const lineClientInstance = getLineClient()

    // 解析 postback data（格式：action=value）
    const params = new URLSearchParams(data)
    const action = params.get('action')

    console.log('Postback 事件:', { userId, action, data })

    switch (action) {
      case 'courses':
        // 課程介紹
        await handleShowCourses(userId, replyToken)
        break
      
      case 'my_enrollment':
        // 我的報名狀態
        await handleEnrollmentStatus(userId, replyToken)
        break
      
      case 'payment_info':
        // 付款資訊
        console.log('收到付款資訊請求:', { userId, action })
        await handlePaymentInfo(userId, replyToken)
        break
      
      case 'payment_report':
      case 'payment_report_start':
      case 'payment_report_quick':
      case 'payment_report_detail':
        // 付款回報（統一使用 handlePaymentReport，它會自動判斷）
        // 傳入空字串作為 message，讓它顯示引導
        await handlePaymentReport(userId, '', replyToken)
        break
      
      case 'cancel_course':
        // 取消課程（統一使用 handleCancellation）
        await handleCancellation(userId, '', replyToken)
        break
      
      case 'cancel_reason':
        // 選擇取消原因
        const reason = params.get('reason')
        await handleCancelReason(userId, replyToken, reason)
        break
      
      case 'refund_status':
        // 退費狀態查詢
        await handleRefundStatus(userId, replyToken)
        break
      
      case 'refund_policy':
        // 查看退費政策
        await handleRefundPolicy(userId, replyToken)
        break
      
      case 'course_detail':
        // 課程詳情
        const course = params.get('course')
        await handleCourseDetail(userId, replyToken, course)
        break
      
      case 'enroll':
        // 立即報名
        const enrollCourse = params.get('course')
        await handleEnrollFromTemplate(userId, replyToken, enrollCourse)
        break
      
      case 'contact':
        // 聯絡客服
        await handleContact(userId, replyToken)
        break
      
      default:
        await safeReplyMessage(lineClientInstance, replyToken, '抱歉，無法識別此操作，請稍後再試。')
    }

  } catch (error) {
    console.error('處理 Postback 事件時發生錯誤:', error)
    const lineClientInstance = getLineClient()
    await safeReplyMessage(lineClientInstance, replyToken, '抱歉，系統暫時無法處理您的請求，請稍後再試。')
  }
}

// 處理用戶加入好友事件
async function handleFollow(event) {
  const { replyToken, source } = event
  const userId = source.userId

  try {
    const prismaInstance = getPrisma()
    const lineClientInstance = getLineClient()

    // 檢查是否為新用戶
    const existingUser = await prismaInstance.user.findUnique({
      where: { lineUserId: userId }
    })

    if (!existingUser) {
      // 新用戶，發送歡迎訊息和課程介紹卡片
      const welcomeMessage = `🎵 歡迎來到 MyMusic 音樂課程！

感謝您加入我們的音樂課程 Bot！

📱 **Rich Menu（圖文選單）**
在聊天室下方，您會看到一個圖文選單，包含以下功能：

🎵 **課程介紹** - 查看所有課程詳細資訊
📋 **我的報名** - 查詢您的報名狀態
💳 **付款資訊** - 查看付款方式
✅ **付款回報** - 回報您的付款資訊
❌ **取消/退費** - 取消課程或查詢退費
💬 **聯絡老師** - 聯繫我們

💡 **快速開始**
點擊「課程介紹」查看所有課程並開始報名流程

我們會盡快為您服務！`

      await safeReplyMessage(lineClientInstance, replyToken, welcomeMessage, userId)
      
      // 發送課程介紹卡片
      try {
        const carousel = createCoursesCarousel()
        await lineClientInstance.pushMessage(userId, carousel)
      } catch (error) {
        console.error('發送課程介紹卡片失敗:', error)
        // 如果卡片發送失敗，不影響歡迎訊息
      }
    } else {
      // 已存在的用戶，根據狀態發送個人化歡迎訊息
      const courseName = getCourseName(existingUser.course)
      let welcomeBackMessage = `👋 歡迎回來，${existingUser.name}！

📱 **Rich Menu 快速操作**
在聊天室下方，您可以使用圖文選單快速操作：

`

      // 根據用戶狀態提供不同的提示
      if (existingUser.enrollmentStatus === 'ACTIVE') {
        if (existingUser.paymentStatus === 'PAID') {
          welcomeBackMessage += `✅ 您已完成報名並付款「${courseName}」
• 點擊「我的報名」查看完整資訊
• 點擊「取消/退費」如需取消課程
• 點擊「聯絡老師」如有任何問題`
        } else if (existingUser.paymentStatus === 'PARTIAL') {
          const shortAmount = calculateShortAmount(existingUser)
          
          welcomeBackMessage += `⚠️ 您已報名「${courseName}」，但付款尚未完成
• 尚需補付：${shortAmount} 元
• 點擊「付款資訊」查看付款方式
• 點擊「付款回報」回報付款資訊
• 點擊「我的報名」查看詳細狀態`
        } else {
          welcomeBackMessage += `📝 您已報名「${courseName}」，請完成付款
• 點擊「付款資訊」查看付款方式
• 點擊「付款回報」回報付款資訊
• 點擊「我的報名」查看詳細狀態`
        }
      } else if (existingUser.enrollmentStatus === 'CANCELLED') {
        welcomeBackMessage += `❌ 您的課程已取消
• 點擊「取消/退費」查詢退費狀態
• 點擊「課程介紹」查看所有課程並開始報名流程`
      } else {
        welcomeBackMessage += `📋 點擊「我的報名」查看您的報名狀態
• 點擊「付款資訊」查看付款方式
• 點擊「付款回報」回報付款資訊
• 點擊「聯絡老師」如有任何問題`
      }

      welcomeBackMessage += `\n\n如有任何問題，請隨時聯繫我們！`

      await safeReplyMessage(lineClientInstance, replyToken, welcomeBackMessage, userId)
    }

  } catch (error) {
    console.error('處理 Follow 事件時發生錯誤:', error)
  }
}

// 顯示課程介紹（使用輪播卡片）
async function handleShowCourses(userId, replyToken) {
  const lineClientInstance = getLineClient()
  
  const carousel = createCoursesCarousel()
  await safeReplyMessage(lineClientInstance, replyToken, carousel, userId)
}

// 查詢報名狀態
async function handleEnrollmentStatus(userId, replyToken) {
  const prismaInstance = getPrisma()
  const lineClientInstance = getLineClient()

  try {
    const user = await prismaInstance.user.findUnique({
      where: { lineUserId: userId }
    })

    if (!user) {
      await safeReplyMessage(lineClientInstance, replyToken, `❌ 找不到您的報名記錄

您目前尚未報名任何課程。

如需報名，請回覆：
姓名：[您的姓名]
課程：[歌唱課/吉他課/創作課/春曲創作團班]`)
      return
    }

    const courseName = getCourseName(user.course)
    const coursePrice = getCoursePrice(user.course)
    
    // 付款狀態文字
    let paymentStatusText = ''
    if (user.paymentStatus === 'PAID') {
      paymentStatusText = '✅ 已付款'
    } else if (user.paymentStatus === 'PARTIAL') {
      const shortAmount = calculateShortAmount(user)
      paymentStatusText = `⚠️ 部分付款（尚需補付 ${shortAmount} 元）`
    } else {
      paymentStatusText = '❌ 尚未付款'
    }

    // 報名狀態文字
    let enrollmentStatusText = ''
    if (user.enrollmentStatus === 'ACTIVE') {
      enrollmentStatusText = '✅ 已報名'
    } else if (user.enrollmentStatus === 'CANCELLED') {
      enrollmentStatusText = '❌ 已取消'
    } else {
      enrollmentStatusText = '❓ 狀態不明'
    }

    // 退費狀態文字
    let refundStatusText = ''
    if (user.refundStatus === 'COMPLETED') {
      refundStatusText = `✅ 已退款（${user.refundAmount || '待確認'}）`
    } else if (user.refundStatus === 'PENDING') {
      refundStatusText = '⏳ 退費處理中'
    } else {
      refundStatusText = '無'
    }

    // 根據狀態組合決定顯示的提示訊息
    let statusHint = ''
    
    // 優先級 1：已取消 + 已退費
    if (user.enrollmentStatus === 'CANCELLED' && user.refundStatus === 'COMPLETED') {
      statusHint = `✅ 課程已取消，退費已完成（${user.refundAmount || '待確認'}）

📱 如需重新報名，請使用圖文選單：
• 點擊「課程介紹」查看所有課程並開始報名流程
• 點擊「聯絡老師」如有任何問題`
    }
    // 優先級 2：已取消 + 退費處理中
    else if (user.enrollmentStatus === 'CANCELLED' && user.refundStatus === 'PENDING') {
      statusHint = `⏳ 課程已取消，退費處理中

我們正在處理您的退費申請，請耐心等候。
退費完成後會通知您。

如需查詢退費狀態，請點擊「取消/退費」→「退費狀態查詢」`
    }
    // 優先級 3：已取消 + 未退費（但可能有部分付款）
    else if (user.enrollmentStatus === 'CANCELLED') {
      // 檢查是否有付款需要退費
      const paidAmount = parseAmount(user.paymentAmount)
      if (paidAmount > 0) {
        statusHint = `❌ 課程已取消

您已付款 ${user.paymentAmount || '0'} 元，如需申請退費，請：
• 點擊「取消/退費」→「申請退費」
• 或聯繫客服處理退費事宜`
      } else {
        statusHint = `❌ 課程已取消

📱 如需重新報名，請使用圖文選單：
• 點擊「課程介紹」查看所有課程並開始報名流程`
      }
    }
    // 優先級 4：有效報名 + 已付款
    else if (user.enrollmentStatus === 'ACTIVE' && user.paymentStatus === 'PAID') {
      statusHint = `✅ 您已完成報名並付款，我們會盡快與您聯繫安排課程！

如有任何問題，請點擊「聯絡老師」聯繫我們。`
    }
    // 優先級 5：有效報名 + 部分付款
    else if (user.enrollmentStatus === 'ACTIVE' && user.paymentStatus === 'PARTIAL') {
      const shortAmount = calculateShortAmount(user)
      statusHint = `⚠️ 您尚未完成付款，請盡快補付剩餘金額。

尚需補付：${shortAmount} 元

請選擇：
• 點擊「付款資訊」查看付款方式
• 點擊「付款回報」回報付款資訊`
    }
    // 優先級 6：有效報名 + 未付款
    else if (user.enrollmentStatus === 'ACTIVE') {
      statusHint = `📝 請盡快完成付款以確認報名。

請選擇：
• 點擊「付款資訊」查看付款方式
• 點擊「付款回報」回報付款資訊`
    }
    // 其他情況
    else {
      statusHint = `📋 如需重新報名，請使用圖文選單：
• 點擊「課程介紹」查看所有課程並開始報名流程。`
    }

    const statusMessage = `📋 您的報名狀態

👤 姓名：${user.name}
📚 課程：${courseName}
💰 應付金額：${coursePrice}
📅 報名日期：${user.enrollmentDate ? new Date(user.enrollmentDate).toLocaleDateString('zh-TW') : '未記錄'}

📊 狀態資訊：
• 報名狀態：${enrollmentStatusText}
• 付款狀態：${paymentStatusText}
• 退費狀態：${refundStatusText}

${statusHint}`

    await safeReplyMessage(lineClientInstance, replyToken, statusMessage)

  } catch (error) {
    console.error('查詢報名狀態時發生錯誤:', error)
    await safeReplyMessage(lineClientInstance, replyToken, '抱歉，查詢報名狀態時發生錯誤，請稍後再試。')
  }
}

// 顯示付款資訊（使用 Template Message）
async function handlePaymentInfo(userId, replyToken) {
  const prismaInstance = getPrisma()
  const lineClientInstance = getLineClient()

  try {
    console.log('處理付款資訊請求:', { userId, replyToken })
    
    const user = await prismaInstance.user.findUnique({
      where: { lineUserId: userId }
    })

    console.log('用戶查詢結果:', { user: user ? { id: user.id, course: user.course, name: user.name } : null })

    if (!user || !user.course) {
      // 未報名用戶或沒有課程資訊，顯示一般付款資訊
      console.log('用戶未報名或無課程資訊，顯示一般付款資訊')
      const generalPaymentInfo = `💳 付款資訊

🏦 銀行：台灣銀行 (004)
💳 帳號：1234567890123456
👤 戶名：蘇文紹

📚 課程價格：
• 歌唱課：NT$ 3,000
• 吉他課：NT$ 4,000
• 創作課：NT$ 5,000
• 春曲創作團班：NT$ 6,000

📝 重要提醒：
• 請於報名後 3 天內完成付款
• 付款完成後，請回報付款資訊
• 我們會在確認付款後 24 小時內與您聯繫

📱 如需報名，請使用圖文選單：
• 點擊「課程介紹」查看所有課程並開始報名流程！`

      await safeReplyMessage(lineClientInstance, replyToken, generalPaymentInfo)
      console.log('一般付款資訊已發送')
      return
    }

    // 已報名用戶，顯示個人付款資訊 Template
    console.log('為已報名用戶顯示付款資訊:', { userId, course: user.course, name: user.name })
    const paymentTemplate = createPaymentInfoTemplate(user)
    console.log('付款資訊模板:', JSON.stringify(paymentTemplate, null, 2))
    await safeReplyMessage(lineClientInstance, replyToken, paymentTemplate, userId)
    console.log('付款資訊 Template 已成功發送')

  } catch (error) {
    console.error('顯示付款資訊時發生錯誤:', error)
    console.error('錯誤詳情:', error.stack)
    console.error('錯誤訊息:', error.message)
    try {
      await safeReplyMessage(lineClientInstance, replyToken, `抱歉，顯示付款資訊時發生錯誤：${error.message}`)
    } catch (replyError) {
      console.error('回覆錯誤訊息時發生錯誤:', replyError)
      console.error('回覆錯誤詳情:', replyError.stack)
    }
  }
}

// 統一的付款回報引導函數（供 Rich Menu 和文字輸入使用）
async function showPaymentReportGuide(userId, replyToken, user = null) {
  const prismaInstance = getPrisma()
  const lineClientInstance = getLineClient()

  try {
    // 如果沒有傳入用戶，從資料庫獲取
    if (!user) {
      user = await prismaInstance.user.findUnique({
        where: { lineUserId: userId }
      })

      if (!user) {
        await safeReplyMessage(lineClientInstance, replyToken, '❌ 找不到您的報名記錄，請先完成報名。')
        return
      }
    }

    const coursePrice = getCoursePrice(user.course)
    const bankList = `• 台灣銀行、土地銀行、合作金庫、第一銀行、華南銀行
• 彰化銀行、上海銀行、富邦銀行、國泰世華、中國信託
• 台新銀行、玉山銀行、元大銀行、永豐銀行、兆豐銀行
• 郵局、其他`

    const guideMessage = `💳 付款回報

請先選擇您的匯款銀行：

完成銀行選擇後，請繼續提供：
• 後五碼：[帳號後五碼]
• 金額：${coursePrice}

例如:
後五碼: 12345
金額: ${coursePrice.replace(/[^\d]/g, '')}
備註: 已匯款完成（選填）

我們會立即確認您的付款！`

    // 創建帶有銀行選擇選單的訊息
    const messageWithBankMenu = {
      type: 'text',
      text: guideMessage,
      ...createBankSelectionQuickReply()
    }

    await safeReplyMessage(lineClientInstance, replyToken, messageWithBankMenu, userId)

  } catch (error) {
    console.error('顯示付款回報引導時發生錯誤:', error)
    await safeReplyMessage(lineClientInstance, replyToken, '抱歉，系統暫時無法處理您的請求，請稍後再試。')
  }
}

// 付款回報引導（使用 Template Message）- 保留用於向後兼容，但改為調用統一函數
async function handlePaymentReportGuide(userId, replyToken) {
  await showPaymentReportGuide(userId, replyToken)
}

// 開始付款回報流程 - 統一調用 showPaymentReportGuide
async function handlePaymentReportStart(userId, replyToken) {
  await showPaymentReportGuide(userId, replyToken)
}

// 快速付款回報 - 統一調用 showPaymentReportGuide
async function handlePaymentReportQuick(userId, replyToken) {
  await showPaymentReportGuide(userId, replyToken)
}

// 詳細付款回報 - 統一調用 showPaymentReportGuide
async function handlePaymentReportDetail(userId, replyToken) {
  await showPaymentReportGuide(userId, replyToken)
}

// 取消課程引導（使用 Template Message）- 統一調用 handleCancellation
async function handleCancelCourseGuide(userId, replyToken) {
  // 統一使用 handleCancellation，傳入空字串讓它顯示引導
  await handleCancellation(userId, '', replyToken)
}

// 處理取消原因選擇
async function handleCancelReason(userId, replyToken, reason) {
  const prismaInstance = getPrisma()
  const lineClientInstance = getLineClient()

  try {
    const user = await prismaInstance.user.findUnique({
      where: { lineUserId: userId }
    })

    if (!user) {
      await safeReplyMessage(lineClientInstance, replyToken, '❌ 找不到您的報名記錄，請先完成報名。')
      return
    }

    // 暫時保存取消原因到用戶的備註欄位（作為臨時儲存）
    // 注意：這是一個簡化的方案，在生產環境中應該使用會話管理
    await prismaInstance.user.update({
      where: { lineUserId: userId },
      data: {
        paymentNotes: `[TEMP_CANCEL_REASON]${reason}`
      }
    })

    // 詢問退費需求
    const message = {
      type: 'text',
      text: `您選擇的取消原因：${reason}\n\n請選擇是否需要退費：`,
      ...createRefundRequestQuickReply()
    }

    await safeReplyMessage(lineClientInstance, replyToken, message, userId)

  } catch (error) {
    console.error('處理取消原因時發生錯誤:', error)
    await safeReplyMessage(lineClientInstance, replyToken, '抱歉，系統暫時無法處理您的請求，請稍後再試。')
  }
}

// 處理退費需求選擇
async function handleRefundRequest(userId, replyToken, refundRequest) {
  const prismaInstance = getPrisma()
  const lineClientInstance = getLineClient()

  try {
    const user = await prismaInstance.user.findUnique({
      where: { lineUserId: userId }
    })

    if (!user) {
      await safeReplyMessage(lineClientInstance, replyToken, '❌ 找不到您的報名記錄，請先完成報名。')
      return
    }

    if (user.enrollmentStatus === 'CANCELLED') {
      await safeReplyMessage(lineClientInstance, replyToken, '❌ 您的課程已經取消過了。')
      return
    }

    // 從備註欄位取得取消原因（臨時方案）
    let reason = '未指定'
    if (user.paymentNotes && user.paymentNotes.includes('[TEMP_CANCEL_REASON]')) {
      reason = user.paymentNotes.replace('[TEMP_CANCEL_REASON]', '').trim()
    }

    // 驗證姓名和課程
    const courseName = getCourseName(user.course)

    // 更新用戶狀態
    await prismaInstance.user.update({
      where: { lineUserId: userId },
      data: {
        enrollmentStatus: 'CANCELLED',
        cancellationDate: new Date(),
        cancellationReason: reason,
        refundStatus: (refundRequest === '是' || refundRequest === '需要退費') ? 'PENDING' : 'NONE',
        paymentNotes: null // 清除臨時資料
      }
    })

    // 構建回覆訊息
    let replyMessage = `✅ 取消申請已收到！

取消資訊：
• 姓名：${user.name}
• 課程：${courseName}
• 取消原因：${reason}
• 退費需求：${refundRequest}

`

    if (refundRequest === '是' || refundRequest === '需要退費') {
      // 根據付款狀況決定退費政策
      const paidAmount = parseAmount(user.paymentAmount)
      
      // 計算開課前剩餘天數
      let daysUntilCourseStart = null
      if (user.courseStartDate) {
        const courseStartDate = new Date(user.courseStartDate)
        const now = new Date()
        // 計算開課日期 - 今天的日期（以天為單位）
        daysUntilCourseStart = Math.floor((courseStartDate - now) / (1000 * 60 * 60 * 24))
      }
      
      if (user.paymentStatus === 'PAID' || user.paymentStatus === 'PARTIAL') {
        // 有付款（全額或部分），需要退費
        if (paidAmount > 0) {
          // 如果沒有設定開課日期，使用報名日期作為備用計算方式
          if (daysUntilCourseStart === null) {
            const enrollmentDate = new Date(user.enrollmentDate)
            const daysSinceEnrollment = Math.floor((new Date() - enrollmentDate) / (1000 * 60 * 60 * 24))
            // 如果報名後超過 7 天，視為超過 7 天
            daysUntilCourseStart = daysSinceEnrollment <= 7 ? 7 : -1
          }
          
          if (daysUntilCourseStart >= 0 && daysUntilCourseStart <= 7) {
            // 開課前 7 天內取消：全額退還已付金額
            replyMessage += `💰 退費政策：
• 開課前 7 天內取消：全額退費
• 您已付款：${user.paymentAmount || '0'} 元
• 退費金額：${user.paymentAmount || '待確認'}
• 退費將在 3-5 個工作天內處理完成

我們會盡快為您處理退費事宜！`
          } else {
            // 開課前超過 7 天或已開課：部分退費（50%）
            const refundAmount = Math.floor(paidAmount * 0.5)
            replyMessage += `💰 退費政策：
• 開課前 7 天後取消：部分退費（50%）
• 您已付款：${user.paymentAmount || '0'} 元
• 退費金額：${refundAmount} 元
• 退費將在 3-5 個工作天內處理完成

我們會盡快為您處理退費事宜！`
          }
        } else {
          // 雖然狀態是 PAID 或 PARTIAL，但實際付款金額為 0
          replyMessage += `💰 退費政策：
• 您尚未完成付款，無需退費
• 課程已成功取消

感謝您的理解！`
        }
      } else {
        // 未付款（UNPAID 或 PENDING）
        replyMessage += `💰 退費政策：
• 您尚未完成付款，無需退費
• 課程已成功取消

感謝您的理解！`
      }
    } else {
      replyMessage += `課程已成功取消，感謝您的理解！`
    }

    await safeReplyMessage(lineClientInstance, replyToken, replyMessage)

  } catch (error) {
    console.error('處理退費需求時發生錯誤:', error)
    await safeReplyMessage(lineClientInstance, replyToken, '抱歉，系統暫時無法處理您的請求，請稍後再試。')
  }
}

// 聯絡客服
async function handleContact(userId, replyToken) {
  const lineClientInstance = getLineClient()

  const contactMessage = `💬 聯絡我們

如有任何問題或需要協助，請直接在此聊天室留言，我們會盡快回覆您！

📱 您也可以使用圖文選單：
• 點擊「課程介紹」查看所有課程
• 點擊「我的報名」查看報名狀態
• 點擊「付款資訊」查看付款方式
• 點擊「付款回報」回報付款資訊
• 點擊「取消/退費」取消課程

我們會盡快為您處理！`

  await safeReplyMessage(lineClientInstance, replyToken, contactMessage)
}

// 退費狀態查詢
async function handleRefundStatus(userId, replyToken) {
  const prismaInstance = getPrisma()
  const lineClientInstance = getLineClient()

  try {
    const user = await prismaInstance.user.findUnique({
      where: { lineUserId: userId }
    })

    if (!user) {
      await safeReplyMessage(lineClientInstance, replyToken, '❌ 找不到您的報名記錄，請先完成報名。')
      return
    }

    if (user.refundStatus === 'NONE') {
      await safeReplyMessage(lineClientInstance, replyToken, `📊 退費狀態查詢

您目前沒有退費記錄。

如需申請退費，請先取消課程並選擇需要退費。`)
      return
    }

    // 使用 Template Message 顯示退費狀態
    const template = createRefundStatusTemplate(user)
    await safeReplyMessage(lineClientInstance, replyToken, template, userId)

  } catch (error) {
    console.error('查詢退費狀態時發生錯誤:', error)
    await safeReplyMessage(lineClientInstance, replyToken, '抱歉，查詢退費狀態時發生錯誤，請稍後再試。')
  }
}

// 查看退費政策
async function handleRefundPolicy(userId, replyToken) {
  const lineClientInstance = getLineClient()

  const policyMessage = `💰 退費政策

根據我們的退費政策：

📅 退費規則：
• 開課前 7 天內取消：全額退費
• 開課前 7 天後取消：部分退費（50%）

⏰ 退費時間：
• 退費將在 3-5 個工作天內處理完成
• 退費金額將退還至原付款帳戶

📝 注意事項：
• 部分付款的情況，將根據已付款金額計算退費
• 超額付款的部分將全額退還
• 如有疑問，請聯繫客服

如需申請退費，請點擊「取消課程」開始流程。`

  await safeReplyMessage(lineClientInstance, replyToken, policyMessage)
}

// 課程詳情（純資訊展示，提供立即報名按鈕）
async function handleCourseDetail(userId, replyToken, courseCode) {
  const lineClientInstance = getLineClient()

  try {
    // 使用 Template Message 顯示課程詳情，並提供立即報名按鈕
    const courseDetailTemplate = createCourseDetailTemplate(courseCode)
    await safeReplyMessage(lineClientInstance, replyToken, courseDetailTemplate)
  } catch (error) {
    console.error('顯示課程詳情時發生錯誤:', error)
    await safeReplyMessage(lineClientInstance, replyToken, '抱歉，無法顯示課程詳情，請稍後再試。')
  }
}

// 從 Template 報名
async function handleEnrollFromTemplate(userId, replyToken, courseCode) {
  const lineClientInstance = getLineClient()
  const prismaInstance = getPrisma()

  try {
    // 檢查用戶是否已經報名
    const existingUser = await prismaInstance.user.findUnique({
      where: { lineUserId: userId }
    })

    // 如果用戶已存在且是有效報名且已付款，不允許重複報名
    if (existingUser && existingUser.enrollmentStatus === 'ACTIVE' && existingUser.paymentStatus === 'PAID') {
      await safeReplyMessage(lineClientInstance, replyToken, `✅ 您目前已經完成報名並付款！

如需報名新一季課程，請先取消現有報名後再重新報名。

📱 請使用圖文選單：
• 點擊「取消/退費」取消現有報名
• 點擊「聯絡老師」如有任何疑問`)
      return
    }

    // 如果用戶已存在但未完成付款，提醒完成付款
    if (existingUser && existingUser.enrollmentStatus === 'ACTIVE' && 
        (existingUser.paymentStatus === 'PARTIAL' || existingUser.paymentStatus === 'PENDING' || existingUser.paymentStatus === 'UNPAID')) {
      await safeReplyMessage(lineClientInstance, replyToken, `您目前已經有報名記錄，但付款尚未完成！

您的當前報名資訊：
• 姓名：${existingUser.name}
• 課程：${getCourseName(existingUser.course)}
• 付款狀態：${existingUser.paymentStatus === 'PARTIAL' ? '部分付款' : 
                      existingUser.paymentStatus === 'PENDING' ? '待補付' : '尚未付款'}

📱 請使用圖文選單：
• 點擊「付款回報」完成付款
• 點擊「取消/退費」取消現有報名`)
      return
    }

    const courseName = getCourseName(courseCode)
    const coursePrice = getCoursePrice(courseCode)
    
    // 如果用戶已取消課程，保存當前選擇的課程到 paymentNotes 作為臨時存儲
    // 這樣當用戶只輸入姓名時，我們可以知道他們想報名哪個課程
    if (existingUser && existingUser.enrollmentStatus === 'CANCELLED') {
      // 保存當前選擇的課程（使用特殊格式標記）
      await prismaInstance.user.update({
        where: { lineUserId: userId },
        data: {
          paymentNotes: `[PENDING_COURSE]${courseCode}`
        }
      })

      const enrollmentMessage = `🎵 歡迎重新報名「${courseName}」！

💰 課程價格：${coursePrice}

📝 請提供您的姓名，我們會立即為您處理報名並發送付款資訊。

💡 請按照以下格式回覆：
姓名：[您的姓名]

📌 範例：
姓名：${existingUser.name || '張小明'}

我們收到您的報名資訊後，會立即為您建立報名記錄並提供付款方式！`
      
      const quickReply = {
        type: 'text',
        text: enrollmentMessage,
        quickReply: {
          items: [
            {
              type: 'action',
              action: {
                type: 'message',
                label: '📝 查看報名格式',
                text: '姓名：'
              }
            },
            {
              type: 'action',
              action: {
                type: 'message',
                label: '❓ 我有問題',
                text: '我有報名相關問題'
              }
            }
          ]
        }
      }

      await safeReplyMessage(lineClientInstance, replyToken, quickReply, userId)
      return
    }

    // 新用戶或已完成退費的用戶，也保存選擇的課程（如果用戶存在）
    if (existingUser) {
      await prismaInstance.user.update({
        where: { lineUserId: userId },
        data: {
          paymentNotes: `[PENDING_COURSE]${courseCode}`
        }
      })
    }
    // 注意：新用戶不需要在這裡創建記錄，他們會在輸入姓名時創建
    
    // 新用戶或已完成退費的用戶，提供完整報名訊息
    const enrollmentMessage = `🎵 感謝您選擇「${courseName}」！

💰 課程價格：${coursePrice}

📝 報名流程
━━━━━━━━━━━━━━━━━━
請提供您的姓名，我們會立即為您處理報名並發送付款資訊。

💡 請按照以下格式回覆：
姓名：[您的姓名]

📌 範例：
姓名：張小明

我們收到您的報名資訊後，會立即為您建立報名記錄並提供付款方式，讓您能盡快開始您的音樂學習之旅！

如有任何問題，歡迎隨時聯繫我們。`
    
    // 創建 Quick Reply 選項（提供常見姓名格式範例）
    const quickReply = {
      type: 'text',
      text: enrollmentMessage,
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📝 查看報名格式',
              text: '姓名：'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '❓ 我有問題',
              text: '我有報名相關問題'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📚 查看其他課程',
              text: '課程介紹'
            }
          }
        ]
      }
    }

    await safeReplyMessage(lineClientInstance, replyToken, quickReply, userId)

  } catch (error) {
    console.error('從 Template 報名時發生錯誤:', error)
    await safeReplyMessage(lineClientInstance, replyToken, '抱歉，系統暫時無法處理您的請求，請稍後再試。')
  }
}
