import { PrismaClient } from '@prisma/client'
import { Client } from '@line/bot-sdk'

const prisma = new PrismaClient()
const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
})

export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const { refundStatus, refundAmount, refundDate } = await request.json()

    // 獲取學生資訊
    const student = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    })

    if (!student) {
      return Response.json({ error: '找不到學生記錄' }, { status: 404 })
    }

    // 更新退款狀態
    const updatedStudent = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        refundStatus: refundStatus,
        refundAmount: refundAmount,
        refundDate: refundDate ? new Date(refundDate) : null
      }
    })

    // 如果退款完成，發送 LINE 通知
    if (refundStatus === 'COMPLETED' && student.lineUserId) {
      try {
        const refundMessage = {
          type: 'text',
          text: `💰 退款完成通知

親愛的 ${student.name}，

您的課程退款已完成！

📋 退款詳情：
• 課程：${getCourseName(student.course)}
• 退款金額：${refundAmount}
• 退款日期：${new Date().toLocaleDateString('zh-TW')}
• 退款方式：銀行轉帳

退款將在 1-3 個工作天內匯入您的帳戶。

感謝您的理解，如有任何問題請隨時聯繫我們！

祝您一切順利！🎵`
        }

        await lineClient.pushMessage(student.lineUserId, refundMessage)
      } catch (lineError) {
        console.error('發送 LINE 退款通知失敗:', lineError)
        // 即使 LINE 通知失敗，退款狀態更新仍然成功
      }
    }

    return Response.json({
      success: true,
      student: updatedStudent,
      message: refundStatus === 'COMPLETED' ? '退款完成並已通知學生' : '退款狀態已更新'
    })

  } catch (error) {
    console.error('退款處理錯誤:', error)
    return Response.json({ error: '退款處理失敗' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// 課程代碼轉換為中文名稱的函式
function getCourseName(courseCode) {
  const courseNames = {
    'singing': '歌唱課',
    'guitar': '吉他課',
    'songwriting': '創作課',
    'band-workshop': '春曲創作團班',
    'spring-composition-group': '春曲創作團班'
  }
  return courseNames[courseCode] || courseCode || '未指定'
}
