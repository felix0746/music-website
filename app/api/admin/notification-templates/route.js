import { PrismaClient } from '@prisma/client'

let prisma

function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

// 預設通知模板
const defaultTemplates = {
  paymentReminder: {
    name: '付款提醒',
    type: 'PAYMENT_REMINDER',
    content: `您好 {name}，

關於您的 {course} 報名：

課程：{course}
應付金額：{amount}
已付金額：{paidAmount}
尚需補付：{shortAmount} 元

請盡快補付剩餘金額 {shortAmount} 元，以完成課程報名。

如有任何問題，請隨時聯繫我們。

謝謝！`,
    variables: ['name', 'course', 'amount', 'paidAmount', 'shortAmount']
  },
  courseStartReminder: {
    name: '課程開始提醒',
    type: 'COURSE_START',
    content: `親愛的 {name}，

您的 {course} 即將開始！

課程：{course}
開始時間：{startTime}
地點：{location}

請準時參加，如有任何問題請聯繫我們。

期待與您見面！`,
    variables: ['name', 'course', 'startTime', 'location']
  },
  paymentConfirmation: {
    name: '付款確認',
    type: 'PAYMENT_CONFIRMATION',
    content: `親愛的 {name}，

您的付款已確認！

課程：{course}
付款金額：{amount}
付款時間：{paymentTime}

感謝您的報名，祝您學習愉快！`,
    variables: ['name', 'course', 'amount', 'paymentTime']
  },
  courseCancellation: {
    name: '課程取消通知',
    type: 'COURSE_CANCELLATION',
    content: `親愛的 {name}，

很遺憾地通知您，{course} 因故取消。

取消原因：{reason}
退費處理：{refundInfo}

如有任何疑問，請聯繫我們。

謝謝您的理解！`,
    variables: ['name', 'course', 'reason', 'refundInfo']
  }
}

// 獲取所有通知模板
export async function GET() {
  try {
    return Response.json({
      success: true,
      templates: defaultTemplates
    })
  } catch (error) {
    console.error('獲取通知模板失敗:', error)
    return Response.json(
      { error: '獲取通知模板失敗' },
      { status: 500 }
    )
  }
}

// 創建自訂通知模板
export async function POST(request) {
  try {
    const { name, type, content, variables } = await request.json()

    if (!name || !type || !content) {
      return Response.json(
        { error: '缺少必要參數' },
        { status: 400 }
      )
    }

    // 這裡可以將模板儲存到資料庫
    // 目前先返回成功，實際應用中可以擴展資料庫儲存

    return Response.json({
      success: true,
      message: '通知模板創建成功',
      template: { name, type, content, variables }
    })

  } catch (error) {
    console.error('創建通知模板失敗:', error)
    return Response.json(
      { error: '創建通知模板失敗' },
      { status: 500 }
    )
  }
}
