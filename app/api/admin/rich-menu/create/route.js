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

// POST: 一鍵創建並設定 Rich Menu
export async function POST() {
  try {
    const lineClientInstance = getLineClient()

    // Rich Menu 定義（3x2 配置）
    const richMenu = {
      size: {
        width: 2500,
        height: 1686
      },
      selected: true,
      name: 'MyMusic 主選單',
      chatBarText: '選單',
      areas: [
        // 第一排
        {
          bounds: { x: 0, y: 0, width: 833, height: 843 },
          action: {
            type: 'postback',
            data: 'action=courses',
            label: '課程介紹'
          }
        },
        {
          bounds: { x: 833, y: 0, width: 834, height: 843 },
          action: {
            type: 'postback',
            data: 'action=my_enrollment',
            label: '我的報名'
          }
        },
        {
          bounds: { x: 1667, y: 0, width: 833, height: 843 },
          action: {
            type: 'postback',
            data: 'action=payment_info',
            label: '付款資訊'
          }
        },
        // 第二排
        {
          bounds: { x: 0, y: 843, width: 833, height: 843 },
          action: {
            type: 'postback',
            data: 'action=payment_report',
            label: '付款回報'
          }
        },
        {
          bounds: { x: 833, y: 843, width: 834, height: 843 },
          action: {
            type: 'postback',
            data: 'action=cancel_course',
            label: '取消/退費'
          }
        },
        {
          bounds: { x: 1667, y: 843, width: 833, height: 843 },
          action: {
            type: 'postback',
            data: 'action=contact',
            label: '聯絡老師'
          }
        }
      ]
    }

    // 1. 創建 Rich Menu
    console.log('創建 Rich Menu...')
    const richMenuId = await lineClientInstance.createRichMenu(richMenu)
    console.log('Rich Menu 創建成功:', richMenuId)

    // 注意：不能立即設定為預設，必須先上傳圖片
    // LINE API 要求：must upload richmenu image before applying it to user
    // 2. 設定為預設 Rich Menu（已移除，必須先上傳圖片）
    // console.log('設定為預設 Rich Menu...')
    // await lineClientInstance.setDefaultRichMenu(richMenuId)
    // console.log('已設定為預設 Rich Menu')

    return Response.json({
      success: true,
      message: 'Rich Menu 創建成功！',
      richMenuId: richMenuId,
      nextSteps: {
        step1: '準備 Rich Menu 圖片（2500 x 1686 像素，PNG 或 JPEG，< 1MB）',
        step2: '使用 LINE Developers Console 上傳圖片',
        step3: `進入您的 Channel → Messaging API → Rich Menu → 找到 ID: ${richMenuId} → 點擊「上傳圖片」`,
        step4: '上傳圖片後，使用以下 API 設定為預設：',
        step5: `POST /api/admin/rich-menu {"action": "set_default", "richMenuId": "${richMenuId}"}`,
        consoleUrl: 'https://developers.line.biz/console/',
        note: '⚠️ 必須先上傳圖片才能設定為預設 Rich Menu'
      }
    })
  } catch (error) {
    console.error('創建 Rich Menu 時發生錯誤:', error)
    const errorMessage = error.message || '未知錯誤'
    const errorDetails = error.originalError?.response?.data || error.originalError?.message || error.stack
    
    return Response.json(
      { 
        error: 'Rich Menu 創建失敗: ' + errorMessage,
        details: errorDetails,
        hint: '請檢查：1. LINE_CHANNEL_ACCESS_TOKEN 是否在 Vercel 環境變數中正確設定 2. Token 是否有效且未過期'
      },
      { status: 500 }
    )
  }
}

