import { Client } from '@line/bot-sdk'

function getLineClient() {
  return new Client({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
  })
}

export async function GET() {
  try {
    // 檢查環境變數
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      return Response.json({
        success: false,
        error: 'LINE_CHANNEL_ACCESS_TOKEN 未設定',
        details: '請檢查環境變數設定'
      })
    }

    // 測試 LINE Client 初始化
    const lineClient = getLineClient()
    
    return Response.json({
      success: true,
      message: 'LINE Messaging API 設定正常',
      details: {
        hasAccessToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
        tokenLength: process.env.LINE_CHANNEL_ACCESS_TOKEN?.length || 0,
        clientInitialized: !!lineClient
      }
    })

  } catch (error) {
    console.error('LINE API 測試失敗:', error)
    return Response.json({
      success: false,
      error: 'LINE API 測試失敗',
      details: error.message
    })
  }
}
