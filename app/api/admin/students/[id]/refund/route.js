import { PrismaClient } from '@prisma/client'
import { Client } from '@line/bot-sdk'
import { getCourseName } from '@/lib/lineHelpers'

let prisma
let lineClient

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

export async function PATCH(request, { params }) {
  try {
    const { id } = params
    
    // 驗證參數
    if (!id) {
      return Response.json({ error: '缺少學生 ID' }, { status: 400 })
    }
    
    const body = await request.json()
    const { refundStatus, refundAmount, refundDate } = body
    
    // 驗證退款狀態
    const validRefundStatuses = ['NONE', 'PENDING', 'COMPLETED', 'REJECTED']
    if (!validRefundStatuses.includes(refundStatus)) {
      return Response.json({ 
        error: '無效的退款狀態',
        validStatuses: validRefundStatuses
      }, { status: 400 })
    }

    const prismaInstance = getPrisma()
    const lineClientInstance = getLineClient()
    
    // 獲取學生資訊
    const student = await prismaInstance.user.findUnique({
      where: { id: parseInt(id) }
    })

    if (!student) {
      return Response.json({ error: '找不到學生記錄' }, { status: 404 })
    }

    // 更新退款狀態
    const updatedStudent = await prismaInstance.user.update({
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
        const courseName = getCourseName(student.course)
        const refundMessage = {
          type: 'text',
          text: `💰 退款完成通知

親愛的 ${student.name}，

您的課程退款已完成！

📋 退款詳情：
• 課程：${courseName}
• 退款金額：${refundAmount}
• 退款日期：${new Date().toLocaleDateString('zh-TW')}
• 退款方式：銀行轉帳

退款將在 1-3 個工作天內匯入您的帳戶。

感謝您的理解，如有任何問題請隨時聯繫我們！

祝您一切順利！🎵`
        }

        await lineClientInstance.pushMessage(student.lineUserId, refundMessage)
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
    console.error('錯誤詳情:', {
      message: error.message,
      stack: error.stack,
      id: params?.id
    })
    return Response.json({ 
      error: '退款處理失敗',
      details: error.message || '未知錯誤',
      hint: '請檢查：1. 學生 ID 是否正確 2. 退款狀態是否有效 3. 資料庫連接是否正常'
    }, { status: 500 })
  } finally {
    const prismaInstance = getPrisma()
    await prismaInstance.$disconnect()
  }
}
