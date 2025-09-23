import { PrismaClient } from '@prisma/client'
import { Client } from '@line/bot-sdk'

const prisma = new PrismaClient()
const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
})

export async function POST(request) {
  try {
    const { lineUserId, name, course, message } = await request.json()

    // 驗證必要欄位
    if (!lineUserId || !name || !course) {
      return Response.json(
        { error: '缺少必要欄位：LINE User ID、姓名或課程' },
        { status: 400 }
      )
    }

    // 檢查是否已經報名過
    const existingUser = await prisma.user.findUnique({
      where: { lineUserId: lineUserId }
    })

    if (existingUser) {
      return Response.json(
        { error: '您已經報名過了！' },
        { status: 400 }
      )
    }

    // 課程名稱對應
    const courseNames = {
      'singing': '歌唱課',
      'guitar': '吉他課',
      'songwriting': '創作課',
      'band-workshop': '春曲創作團班'
    }

    const courseName = courseNames[course] || course

    // 創建新用戶記錄
    const newUser = await prisma.user.create({
      data: {
        lineUserId: lineUserId,
        name: name,
        course: course,
        enrollmentDate: new Date(),
        isVerified: true,
        welcomeMessageSent: true
      }
    })

    // 發送付款資訊給學員
    const paymentMessage = {
      type: 'text',
      text: `🎵 感謝 ${name} 報名「${courseName}」！

以下是您的付款資訊：

🏦 銀行：[您的銀行名稱] ([銀行代碼])
💳 帳號：[您的銀行帳號]
👤 戶名：[您的戶名]
💰 金額：[課程金額]

📝 重要提醒：
• 請於 3 天內完成付款
• 付款完成後，請回覆「姓名」與「帳號後五碼」
• 我們會在確認付款後 24 小時內與您聯繫

如有任何問題，請隨時與我們聯繫！
祝您學習愉快！😊`
    }

    await lineClient.pushMessage(lineUserId, paymentMessage)

    // 發送通知給管理員（透過 Email）
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'dummy-key') {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      
      await resend.emails.send({
        from: 'MyMusic <onboarding@resend.dev>',
        to: ['johnsonyao466@gmail.com'],
        subject: `「${courseName}」新 LINE 報名通知！`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">新 LINE 報名通知</h2>
            <p>您好！有新的學員透過 LINE 報名課程：</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #334155; margin-top: 0;">學員資訊</h3>
              <p><strong>姓名：</strong>${name}</p>
              <p><strong>LINE User ID：</strong>${lineUserId}</p>
              <p><strong>報名課程：</strong>${courseName}</p>
              <p><strong>報名時間：</strong>${new Date().toLocaleString('zh-TW')}</p>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">
              付款資訊已自動發送給學員，請等待學員完成付款。
            </p>
          </div>
        `
      })
    }

    return Response.json({
      success: true,
      message: '報名成功！付款資訊已發送',
      userId: newUser.id
    })

  } catch (error) {
    console.error('LINE 報名 API 錯誤:', error)
    return Response.json(
      { error: '伺服器錯誤' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
