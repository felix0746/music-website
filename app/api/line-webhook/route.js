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
  createRefundRequestQuickReply
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
  
  // 如果有 replyToken，優先使用 replyMessage
  if (replyToken) {
    try {
      await lineClient.replyMessage(replyToken, messageObj)
      return
    } catch (error) {
      console.error('回覆訊息失敗:', error.message)
      // 如果回覆失敗，且有用戶 ID，使用 pushMessage 作為備選
      if (userId) {
        try {
          await lineClient.pushMessage(userId, messageObj)
          return
        } catch (pushError) {
          console.error('Push 訊息也失敗:', pushError.message)
        }
      }
    }
  }
  
  // 如果沒有 replyToken 但有用戶 ID，使用 pushMessage
  if (userId) {
    try {
      await lineClient.pushMessage(userId, messageObj)
    } catch (pushError) {
      console.error('Push 訊息失敗:', pushError.message)
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
      // 優先檢查是否為取消課程格式（包含取消原因和退費需求）
      if ((userMessage.includes('姓名：') || userMessage.includes('姓名:')) && 
          (userMessage.includes('課程：') || userMessage.includes('課程:')) &&
          (userMessage.includes('取消原因：') || userMessage.includes('取消原因:')) &&
          (userMessage.includes('退費需求：') || userMessage.includes('退費需求:'))) {
        // 用戶想要取消課程
        await handleCancellation(userId, userMessage, replyToken)
      } else if ((userMessage.includes('姓名：') || userMessage.includes('姓名:')) && (userMessage.includes('課程：') || userMessage.includes('課程:'))) {
        // 用戶提供了報名資訊，處理重新報名
        await handleReEnrollment(userId, userMessage, replyToken)
      } else if (userMessage.includes('付款') || userMessage.includes('匯款') || userMessage.includes('後五碼')) {
        await handlePaymentReport(userId, userMessage, replyToken)
      } else if (userMessage.includes('報名') || userMessage.includes('新課程') || userMessage.includes('下一季')) {
        // 用戶想要重新報名，但先檢查當前狀態
        await handleEnrollmentRequest(userId, userMessage, replyToken)
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
      } else {
        // 發送一般回覆，提供多個選項
        const courseName = getCourseName(existingUser.course)
        let generalMessage = `👋 歡迎回來！

您目前已經報名過「${courseName}」，請選擇您需要的服務：

📱 **使用 Rich Menu 快速操作**
在聊天室下方，您可以使用圖文選單：
• 點擊「我的報名」查看完整狀態
• 點擊「付款資訊」查看付款方式
• 點擊「付款回報」回報付款資訊
• 點擊「取消/退費」取消課程

💬 **或直接輸入文字**
• 回覆「付款」開始付款回報流程
• 回覆「報名」開始新的報名流程
• 回覆「取消」開始取消流程

❓ 其他問題
如有任何疑問，請直接告訴我們！`

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
👤 戶名：蘇文紹
💰 金額：${coursePrice}

📝 重要提醒：
• 請於 3 天內完成付款
• 付款完成後，請回覆「姓名」與「帳號後五碼」
• 我們會在確認付款後 24 小時內與您聯繫

💳 付款回報格式
請按照以下格式提供您的付款資訊：

姓名: [您的姓名]
後五碼: [帳號後五碼]
金額: [匯款金額]
備註: [其他說明, 選填]

例如:
姓名: 張小明
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

📱 **如何使用 Rich Menu（圖文選單）**
在聊天室下方，您會看到一個圖文選單，包含以下功能：

🎵 **課程介紹** - 查看所有課程詳細資訊
📋 **我的報名** - 查詢您的報名狀態
💳 **付款資訊** - 查看付款方式
✅ **付款回報** - 回報您的付款資訊
❌ **取消/退費** - 取消課程或查詢退費
💬 **聯絡老師** - 聯繫我們

💡 **快速開始**
• 點擊「課程介紹」查看所有課程
• 或直接回覆「報名」開始報名流程

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

async function handlePaymentReport(userId, message, replyToken) {
  const prismaInstance = getPrisma()
  const lineClientInstance = getLineClient()
  
  // 解析付款回報資訊
  const paymentInfo = parsePaymentMessage(message)
  
  // 獲取用戶資訊
  const user = await prismaInstance.user.findUnique({
    where: { lineUserId: userId }
  })
  
  if (!user) {
    await safeReplyMessage(lineClientInstance, replyToken, '❌ 找不到您的報名記錄，請聯繫客服。')
    return
  }
  
  // 驗證付款金額
  const expectedNumber = getCoursePriceNumber(user.course)
  const paidNumber = parseAmount(paymentInfo.amount)
  
  let enrollmentStatus = 'ACTIVE'
  let paymentStatus = 'PAID'
  let paymentNotes = paymentInfo.notes || ''
  
  // 檢查是否為補付情況
  const isSupplementPayment = user.paymentStatus === 'PARTIAL'
  
  if (isSupplementPayment) {
    // 補付情況：計算累計金額
    const previousAmount = parseAmount(user.paymentAmount)
    const totalPaid = previousAmount + paidNumber
    
    if (totalPaid < expectedNumber) {
      // 補付後仍不足
      const shortAmount = expectedNumber - totalPaid
      paymentStatus = 'PARTIAL'
      paymentNotes = `${user.paymentNotes || ''}\n[補付 ${paidNumber} 元，累計 ${totalPaid} 元，尚需補付 ${shortAmount} 元]`
    } else if (totalPaid === expectedNumber) {
      // 補付完成
      paymentStatus = 'PAID'
      paymentNotes = `${user.paymentNotes || ''}\n[補付 ${paidNumber} 元，累計 ${totalPaid} 元，付款完成]`
    } else {
      // 補付過多
      const overAmount = totalPaid - expectedNumber
      paymentStatus = 'PAID'
      paymentNotes = `${user.paymentNotes || ''}\n[補付 ${paidNumber} 元，累計 ${totalPaid} 元，超額 ${overAmount} 元，將安排退費]`
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
  await prismaInstance.user.update({
    where: { lineUserId: userId },
    data: { 
      paymentStatus: paymentStatus,
      enrollmentStatus: enrollmentStatus,
      paymentReference: paymentInfo.reference,
      paymentAmount: paymentInfo.amount,
      paymentMethod: paymentInfo.method,
      paymentDate: new Date(),
      paymentNotes: paymentNotes,
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

// 解析付款回報訊息的函數
function parsePaymentMessage(message) {
  const result = {
    reference: null,
    amount: null,
    method: '銀行轉帳',
    notes: message
  }
  
  // 提取姓名（支援中文和英文冒號）
  const nameMatch = message.match(/姓名[：:]\s*([^\n\r後五碼金額備註]+)/)
  if (nameMatch) {
    result.name = nameMatch[1].trim()
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

如有任何疑問，請聯繫客服。`)
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

請選擇：
• 完成付款：回覆「付款」開始付款回報流程
• 更改課程：回覆「取消」先取消現有報名`)
      return
    }

    // 如果用戶狀態是 CANCELLED 或 COMPLETED，引導重新報名
    await safeReplyMessage(lineClientInstance, replyToken, `🎵 歡迎報名新一季的音樂課程！

請按照以下格式提供您的資訊：

姓名：[您的姓名]
課程：[歌唱課/吉他課/創作課/春曲創作團班]

例如：
姓名：張小明
課程：歌唱課

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
• 付款完成後，請回覆「姓名」與「帳號後五碼」
• 我們會在確認付款後 24 小時內與您聯繫

💳 付款回報格式
請按照以下格式提供您的付款資訊：

姓名: [您的姓名]
後五碼: [帳號後五碼]
金額: [匯款金額]
備註: [其他說明, 選填]

例如:
姓名: 張小明
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

// 處理取消課程的函數
async function handleCancellation(userId, message, replyToken) {
  const lineClientInstance = getLineClient()
  
  console.log('處理取消課程，用戶 ID:', userId)
  console.log('取消訊息內容:', message)
  
  // 檢查是否包含完整的取消資訊
  if ((message.includes('姓名：') || message.includes('姓名:')) && 
      (message.includes('課程：') || message.includes('課程:')) && 
      (message.includes('取消原因：') || message.includes('取消原因:')) && 
      (message.includes('退費需求：') || message.includes('退費需求:'))) {
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
      
      // 處理取消邏輯
      try {
        const prismaInstance = getPrisma()
        const lineClientInstance = getLineClient()

        // 檢查用戶狀態
        const user = await prismaInstance.user.findUnique({
          where: { lineUserId: userId }
        })

        if (!user) {
          await safeReplyMessage(lineClientInstance, replyToken, '❌ 找不到您的報名記錄，請聯繫客服。')
          return
        }

        if (user.enrollmentStatus === 'CANCELLED') {
          await safeReplyMessage(lineClientInstance, replyToken, '❌ 您的課程已經取消過了。')
          return
        }

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
          const enrollmentDate = new Date(user.enrollmentDate)
          const daysSinceEnrollment = Math.floor((new Date() - enrollmentDate) / (1000 * 60 * 60 * 24))
          
          if (user.paymentStatus === 'PAID' || user.paymentStatus === 'PARTIAL') {
            // 有付款（全額或部分），需要退費
            if (paidAmount > 0) {
              if (daysSinceEnrollment <= 7) {
                // 7天內取消：全額退還已付金額
                replyMessage += `💰 退費政策：
• 開課前 7 天內取消：全額退費
• 您已付款：${user.paymentAmount || '0'} 元
• 退費金額：${user.paymentAmount || '待確認'}
• 退費將在 3-5 個工作天內處理完成

我們會盡快為您處理退費事宜！`
              } else {
                // 7天後取消：部分退費（50%）
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
        await handlePaymentInfo(userId, replyToken)
        break
      
      case 'payment_report':
        // 付款回報
        await handlePaymentReportGuide(userId, replyToken)
        break
      
      case 'payment_report_start':
        // 開始付款回報流程
        await handlePaymentReportStart(userId, replyToken)
        break
      
      case 'payment_report_quick':
        // 快速付款回報
        await handlePaymentReportQuick(userId, replyToken)
        break
      
      case 'payment_report_detail':
        // 詳細付款回報
        await handlePaymentReportDetail(userId, replyToken)
        break
      
      case 'cancel_course':
        // 取消課程
        await handleCancelCourseGuide(userId, replyToken)
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

📱 **如何使用 Rich Menu（圖文選單）**
在聊天室下方，您會看到一個圖文選單，包含以下功能：

🎵 **課程介紹** - 查看所有課程詳細資訊
📋 **我的報名** - 查詢您的報名狀態
💳 **付款資訊** - 查看付款方式
✅ **付款回報** - 回報您的付款資訊
❌ **取消/退費** - 取消課程或查詢退費
💬 **聯絡老師** - 聯繫我們

💡 **快速開始**
• 點擊「課程介紹」查看所有課程
• 或直接回覆「報名」開始報名流程

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
• 如需重新報名，請回覆「報名」
• 點擊「課程介紹」查看所有課程`
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

    const statusMessage = `📋 您的報名狀態

👤 姓名：${user.name}
📚 課程：${courseName}
💰 應付金額：${coursePrice}
📅 報名日期：${user.enrollmentDate ? new Date(user.enrollmentDate).toLocaleDateString('zh-TW') : '未記錄'}

📊 狀態資訊：
• 報名狀態：${enrollmentStatusText}
• 付款狀態：${paymentStatusText}
• 退費狀態：${refundStatusText}

${user.paymentStatus === 'PAID' ? '✅ 您已完成報名並付款，我們會盡快與您聯繫安排課程！' : 
  user.paymentStatus === 'PARTIAL' ? '⚠️ 您尚未完成付款，請盡快補付剩餘金額。' : 
  '📝 請盡快完成付款以確認報名。'}`

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
    const user = await prismaInstance.user.findUnique({
      where: { lineUserId: userId }
    })

    if (!user) {
      // 未報名用戶，顯示一般付款資訊
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

如需報名，請回覆「報名」開始流程！`

      await safeReplyMessage(lineClientInstance, replyToken, generalPaymentInfo)
      return
    }

    // 已報名用戶，顯示個人付款資訊 Template
    const paymentTemplate = createPaymentInfoTemplate(user)
    await safeReplyMessage(lineClientInstance, replyToken, paymentTemplate, userId)

  } catch (error) {
    console.error('顯示付款資訊時發生錯誤:', error)
    await safeReplyMessage(lineClientInstance, replyToken, '抱歉，顯示付款資訊時發生錯誤，請稍後再試。')
  }
}

// 付款回報引導（使用 Template Message）
async function handlePaymentReportGuide(userId, replyToken) {
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

    // 使用 Template Message
    const template = createPaymentReportTemplate(user)
    await safeReplyMessage(lineClientInstance, replyToken, template, userId)

  } catch (error) {
    console.error('付款回報引導時發生錯誤:', error)
    await safeReplyMessage(lineClientInstance, replyToken, '抱歉，系統暫時無法處理您的請求，請稍後再試。')
  }
}

// 開始付款回報流程
async function handlePaymentReportStart(userId, replyToken) {
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

    const coursePrice = getCoursePrice(user.course)
    const message = {
      type: 'text',
      text: `💳 付款回報\n\n請提供您的付款資訊：\n\n姓名: ${user.name}\n後五碼: [請輸入帳號後五碼]\n金額: [請輸入匯款金額]\n\n例如:\n後五碼: 12345\n金額: ${coursePrice.replace(/[^\d]/g, '')}`
    }

    await safeReplyMessage(lineClientInstance, replyToken, message, userId)

  } catch (error) {
    console.error('開始付款回報流程時發生錯誤:', error)
    await safeReplyMessage(lineClientInstance, replyToken, '抱歉，系統暫時無法處理您的請求，請稍後再試。')
  }
}

// 快速付款回報
async function handlePaymentReportQuick(userId, replyToken) {
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

    const coursePrice = getCoursePrice(user.course)
    const message = {
      type: 'text',
      text: `💳 快速付款回報\n\n請直接輸入：\n後五碼: [5位數字]\n金額: [匯款金額]\n\n例如:\n後五碼: 12345\n金額: ${coursePrice.replace(/[^\d]/g, '')}`
    }

    await safeReplyMessage(lineClientInstance, replyToken, message, userId)

  } catch (error) {
    console.error('快速付款回報時發生錯誤:', error)
    await safeReplyMessage(lineClientInstance, replyToken, '抱歉，系統暫時無法處理您的請求，請稍後再試。')
  }
}

// 詳細付款回報
async function handlePaymentReportDetail(userId, replyToken) {
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

    const guideMessage = `💳 詳細付款回報

請按照以下格式提供您的付款資訊：

姓名: ${user.name}
後五碼: [帳號後五碼]
金額: [匯款金額]
備註: [其他說明, 選填]

例如:
姓名: ${user.name}
後五碼: 12345
金額: 3000
備註: 已匯款完成

我們會立即確認您的付款！`

    await safeReplyMessage(lineClientInstance, replyToken, guideMessage)

  } catch (error) {
    console.error('詳細付款回報時發生錯誤:', error)
    await safeReplyMessage(lineClientInstance, replyToken, '抱歉，系統暫時無法處理您的請求，請稍後再試。')
  }
}

// 取消課程引導（使用 Template Message）
async function handleCancelCourseGuide(userId, replyToken) {
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

如需重新報名，請回覆「報名」開始新的報名流程。`)
      }
      return
    }

    // 使用 Template Message
    const template = createCancelCourseTemplate(user)
    await safeReplyMessage(lineClientInstance, replyToken, template, userId)

  } catch (error) {
    console.error('取消課程引導時發生錯誤:', error)
    await safeReplyMessage(lineClientInstance, replyToken, '抱歉，系統暫時無法處理您的請求，請稍後再試。')
  }
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
      const enrollmentDate = new Date(user.enrollmentDate)
      const daysSinceEnrollment = Math.floor((new Date() - enrollmentDate) / (1000 * 60 * 60 * 24))
      
      if (user.paymentStatus === 'PAID' || user.paymentStatus === 'PARTIAL') {
        // 有付款（全額或部分），需要退費
        if (paidAmount > 0) {
          if (daysSinceEnrollment <= 7) {
            // 7天內取消：全額退還已付金額
            replyMessage += `💰 退費政策：
• 開課前 7 天內取消：全額退費
• 您已付款：${user.paymentAmount || '0'} 元
• 退費金額：${user.paymentAmount || '待確認'}
• 退費將在 3-5 個工作天內處理完成

我們會盡快為您處理退費事宜！`
          } else {
            // 7天後取消：部分退費（50%）
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

您也可以：
• 直接輸入您的問題
• 使用 Rich Menu 的其他功能
• 回覆「報名」開始報名流程

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

// 課程詳情
async function handleCourseDetail(userId, replyToken, courseCode) {
  const lineClientInstance = getLineClient()

  const courseDetails = {
    'singing': {
      name: '歌唱課',
      price: 'NT$ 3,000',
      description: '學習如何愛上自己的歌聲，大方唱出感受',
      features: [
        '基礎發聲技巧',
        '音準與節奏訓練',
        '情感表達',
        '舞台表現'
      ]
    },
    'guitar': {
      name: '吉他課',
      price: 'NT$ 4,000',
      description: '從基礎到進階，養成寫作好習慣',
      features: [
        '基礎和弦',
        '指法練習',
        '歌曲彈奏',
        '創作技巧'
      ]
    },
    'songwriting': {
      name: '創作課',
      price: 'NT$ 5,000',
      description: '探索音樂創作的奧秘',
      features: [
        '詞曲創作',
        '編曲技巧',
        '音樂理論',
        '作品錄製'
      ]
    },
    'band-workshop': {
      name: '春曲創作團班',
      price: 'NT$ 6,000',
      description: '與同好交流，一起把創作帶上舞台',
      features: [
        '團體創作',
        '舞台演出',
        '同好交流',
        '作品發表'
      ]
    }
  }

  const course = courseDetails[courseCode] || courseDetails['singing']
  
  const detailMessage = `📚 ${course.name}

💰 價格：${course.price}

📝 課程描述：
${course.description}

✨ 課程特色：
${course.features.map(f => `• ${f}`).join('\n')}

如需報名，請回覆：
姓名：[您的姓名]
課程：${course.name}`

  await safeReplyMessage(lineClientInstance, replyToken, detailMessage)
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

    if (existingUser && existingUser.enrollmentStatus === 'ACTIVE' && existingUser.paymentStatus === 'PAID') {
      await safeReplyMessage(lineClientInstance, replyToken, `您目前已經完成報名並付款！

如需報名新一季課程，請先取消現有報名。`)
      return
    }

    const courseName = getCourseName(courseCode)
    
    const message = {
      type: 'text',
      text: `🎵 報名「${courseName}」

請提供您的姓名：

姓名：[您的姓名]

例如：
姓名：張小明

我們會立即為您處理報名並發送付款資訊！`
    }

    await safeReplyMessage(lineClientInstance, replyToken, message, userId)

  } catch (error) {
    console.error('從 Template 報名時發生錯誤:', error)
    await safeReplyMessage(lineClientInstance, replyToken, '抱歉，系統暫時無法處理您的請求，請稍後再試。')
  }
}
