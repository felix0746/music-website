import { Client } from '@line/bot-sdk'
import { PrismaClient } from '@prisma/client'

let prisma
let lineClient

// 優化的單例模式，避免重複初始化
function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['error'], // 只記錄錯誤，減少日誌開銷
    })
  }
  return prisma
}

function getLineClient() {
  if (!lineClient) {
    lineClient = new Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
      // 添加連接池配置以提升性能
      httpConfig: {
        timeout: 10000, // 10秒超時
        retry: 2, // 重試2次
      }
    })
  }
  return lineClient
}

export async function POST(request) {
  try {
    const { studentId, message } = await request.json()

    if (!studentId || !message) {
      return Response.json(
        { error: '缺少必要參數：studentId 和 message' },
        { status: 400 }
      )
    }

    // 獲取學員資料
    const prismaInstance = getPrisma()
    const student = await prismaInstance.user.findUnique({
      where: { id: studentId }
    })

    if (!student) {
      return Response.json(
        { error: '找不到指定的學員' },
        { status: 404 }
      )
    }

    if (!student.lineUserId) {
      return Response.json(
        { error: '該學員未連結 LINE 帳號' },
        { status: 400 }
      )
    }

    // 發送 LINE 訊息
    const lineClientInstance = getLineClient()
    await lineClientInstance.pushMessage(student.lineUserId, {
      type: 'text',
      text: message
    })

    return Response.json({
      success: true,
      message: '訊息已成功發送',
      studentName: student.name,
      lineUserId: student.lineUserId
    })

  } catch (error) {
    console.error('發送 LINE 訊息時發生錯誤:', error)
    return Response.json(
      { error: '發送訊息失敗: ' + error.message },
      { status: 500 }
    )
  }
}
