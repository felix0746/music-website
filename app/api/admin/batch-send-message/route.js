import { Client } from '@line/bot-sdk'
import { PrismaClient } from '@prisma/client'

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

export async function POST(request) {
  try {
    const { studentIds, message, templateType, filters } = await request.json()

    if (!message && !templateType) {
      return Response.json(
        { error: '缺少訊息內容或模板類型' },
        { status: 400 }
      )
    }

    const prismaInstance = getPrisma()
    const lineClientInstance = getLineClient()

    let targetStudents = []

    // 如果指定了學員 ID 列表
    if (studentIds && studentIds.length > 0) {
      targetStudents = await prismaInstance.user.findMany({
        where: {
          id: { in: studentIds },
          lineUserId: { not: null }
        }
      })
    }
    // 如果指定了篩選條件
    else if (filters) {
      const whereClause = {}
      
      if (filters.paymentStatus && filters.paymentStatus !== 'ALL') {
        whereClause.paymentStatus = filters.paymentStatus
      }
      if (filters.enrollmentStatus && filters.enrollmentStatus !== 'ALL') {
        whereClause.enrollmentStatus = filters.enrollmentStatus
      }
      if (filters.course && filters.course !== 'ALL') {
        whereClause.course = filters.course
      }
      if (filters.searchTerm) {
        whereClause.name = {
          contains: filters.searchTerm,
          mode: 'insensitive'
        }
      }

      whereClause.lineUserId = { not: null }

      targetStudents = await prismaInstance.user.findMany({
        where: whereClause
      })
    }
    // 如果都沒有指定，發送給所有有 LINE 的學員
    else {
      targetStudents = await prismaInstance.user.findMany({
        where: {
          lineUserId: { not: null }
        }
      })
    }

    if (targetStudents.length === 0) {
      return Response.json(
        { error: '沒有找到符合條件的學員' },
        { status: 404 }
      )
    }

    const results = []
    let successCount = 0
    let failCount = 0

    // 批量發送訊息
    for (const student of targetStudents) {
      try {
        let finalMessage = message

        // 如果使用模板，替換變數
        if (templateType) {
          finalMessage = await processTemplate(templateType, student, message)
        }

        await lineClientInstance.pushMessage(student.lineUserId, {
          type: 'text',
          text: finalMessage
        })

        results.push({
          studentId: student.id,
          name: student.name,
          status: 'success'
        })
        successCount++

        // 避免發送過快，稍作延遲
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`發送訊息給 ${student.name} 失敗:`, error)
        results.push({
          studentId: student.id,
          name: student.name,
          status: 'failed',
          error: error.message
        })
        failCount++
      }
    }

    return Response.json({
      success: true,
      message: `批量發送完成：成功 ${successCount} 個，失敗 ${failCount} 個`,
      summary: {
        total: targetStudents.length,
        success: successCount,
        failed: failCount
      },
      results: results
    })

  } catch (error) {
    console.error('批量發送訊息失敗:', error)
    return Response.json(
      { error: '批量發送訊息失敗: ' + error.message },
      { status: 500 }
    )
  }
}

// 處理模板變數替換
async function processTemplate(templateType, student, customMessage) {
  const templates = {
    paymentReminder: `您好 ${student.name}，

關於您的 ${getCourseName(student.course)} 報名：

課程：${getCourseName(student.course)}
應付金額：${getCoursePrice(student.course)}
已付金額：${student.paymentAmount || '0'}
尚需補付：${calculateShortAmount(student)} 元

請盡快補付剩餘金額 ${calculateShortAmount(student)} 元，以完成課程報名。

如有任何問題，請隨時聯繫我們。

謝謝！`,
    courseStartReminder: `親愛的 ${student.name}，

您的 ${getCourseName(student.course)} 即將開始！

課程：${getCourseName(student.course)}
開始時間：請查看課程安排
地點：請查看課程安排

請準時參加，如有任何問題請聯繫我們。

期待與您見面！`,
    paymentConfirmation: `親愛的 ${student.name}，

您的付款已確認！

課程：${getCourseName(student.course)}
付款金額：${student.paymentAmount || '0'}
付款時間：${new Date().toLocaleString('zh-TW')}

感謝您的報名，祝您學習愉快！`,
    courseCancellation: `親愛的 ${student.name}，

很遺憾地通知您，${getCourseName(student.course)} 因故取消。

取消原因：請聯繫我們了解詳情
退費處理：我們會盡快處理退費事宜

如有任何疑問，請聯繫我們。

謝謝您的理解！`
  }

  return templates[templateType] || customMessage
}

// 輔助函數
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

function getCoursePrice(courseCode) {
  const coursePrices = {
    'singing': 'NT$ 3,000',
    'guitar': 'NT$ 4,000',
    'songwriting': 'NT$ 5,000',
    'band-workshop': 'NT$ 6,000',
    'spring-composition-group': 'NT$ 6,000',
    '歌唱課': 'NT$ 3,000',
    '吉他課': 'NT$ 4,000',
    '創作課': 'NT$ 5,000',
    '春曲創作團班': 'NT$ 6,000'
  }
  return coursePrices[courseCode] || 'NT$ 3,000'
}

function calculateShortAmount(student) {
  const expectedPrice = getCoursePrice(student.course)
  const expectedNumber = parseInt(expectedPrice.replace(/[^\d]/g, ''))
  const paidNumber = student.paymentAmount ? parseInt(student.paymentAmount.replace(/[^\d]/g, '')) : 0
  return expectedNumber - paidNumber
}
