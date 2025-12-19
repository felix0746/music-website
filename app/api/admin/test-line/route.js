import { Client } from '@line/bot-sdk'

let lineClient

function getLineClient() {
  if (!lineClient) {
    lineClient = new Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
    })
  }
  return lineClient
}

export async function GET() {
  try {
    // 檢查環境變數
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      return Response.json({
        success: false,
        error: 'LINE_CHANNEL_ACCESS_TOKEN 環境變數未設定',
        details: '請檢查 .env 檔案中是否有設定 LINE_CHANNEL_ACCESS_TOKEN'
      }, { status: 500 })
    }

    const lineClientInstance = getLineClient()
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN

    // 嘗試獲取 Bot 資訊來測試連線
    try {
      // 使用 getBotInfo 來測試連線（如果 API 支援）
      // 或者使用一個簡單的 API 調用來驗證 token
      const response = await fetch('https://api.line.me/v2/bot/info', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        return Response.json({
          success: false,
          error: 'LINE API 連線失敗',
          details: `HTTP ${response.status}: ${errorText}`,
          hint: '請檢查：1. LINE_CHANNEL_ACCESS_TOKEN 是否正確 2. Token 是否已過期 3. 網路連線是否正常'
        }, { status: response.status })
      }

      const botInfo = await response.json()

      return Response.json({
        success: true,
        message: 'LINE API 連線正常',
        details: {
          tokenLength: token.length,
          botName: botInfo.displayName || '未知',
          botId: botInfo.userId || '未知',
          verified: true
        }
      })

    } catch (apiError) {
      console.error('LINE API 測試錯誤:', apiError)
      return Response.json({
        success: false,
        error: 'LINE API 連線測試失敗',
        details: apiError.message || '未知錯誤',
        hint: '請檢查：1. LINE_CHANNEL_ACCESS_TOKEN 是否正確 2. 網路連線是否正常 3. LINE API 服務是否可用'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('測試 LINE 連線時發生錯誤:', error)
    return Response.json({
      success: false,
      error: '測試連線時發生錯誤',
      details: error.message || '未知錯誤',
      hint: '請檢查伺服器日誌以獲取更多資訊'
    }, { status: 500 })
  }
}

