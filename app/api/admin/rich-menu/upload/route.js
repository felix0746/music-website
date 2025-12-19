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

// POST: 上傳 Rich Menu 圖片（支援檔案上傳）
export async function POST(request) {
  try {
    // 確保正確解析 FormData
    let formData
    try {
      formData = await request.formData()
    } catch (error) {
      console.error('解析 FormData 失敗:', error)
      return Response.json(
        { error: '無法解析表單資料，請確認使用 multipart/form-data 格式' },
        { status: 400 }
      )
    }

    const richMenuId = formData.get('richMenuId')
    const imageFile = formData.get('image')

    if (!richMenuId) {
      return Response.json(
        { error: '缺少 richMenuId 參數' },
        { status: 400 }
      )
    }

    if (!imageFile) {
      return Response.json(
        { error: '缺少 image 檔案' },
        { status: 400 }
      )
    }

    // 驗證檔案類型
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(imageFile.type)) {
      return Response.json(
        { error: '不支援的檔案類型，請使用 PNG 或 JPEG' },
        { status: 400 }
      )
    }

    // 驗證檔案大小（< 1MB）
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    if (buffer.length > 1024 * 1024) {
      return Response.json(
        { error: '檔案大小超過 1MB，請壓縮圖片' },
        { status: 400 }
      )
    }

    // 上傳圖片到 LINE
    const lineClientInstance = getLineClient()
    await lineClientInstance.setRichMenuImage(richMenuId, buffer)

    return Response.json({
      success: true,
      message: 'Rich Menu 圖片上傳成功！',
      richMenuId: richMenuId,
      fileName: imageFile.name,
      fileSize: buffer.length,
      fileType: imageFile.type,
      nextStep: '上傳圖片後，可以使用 set_default action 設定為預設 Rich Menu'
    })

  } catch (error) {
    console.error('上傳 Rich Menu 圖片時發生錯誤:', error)
    const errorMessage = error.message || '未知錯誤'
    let errorDetails = error.originalError?.response?.data || error.originalError?.message
    
    // 如果是 LINE API 錯誤，提取詳細資訊
    if (error.originalError?.response) {
      try {
        errorDetails = JSON.stringify(error.originalError.response.data)
      } catch {
        errorDetails = error.originalError.response.statusText
      }
    }
    
    return Response.json(
      { 
        success: false,
        error: 'Rich Menu 圖片上傳失敗: ' + errorMessage,
        details: errorDetails || error.stack,
        hint: '請檢查：1. Rich Menu ID 是否正確 2. 圖片格式是否為 PNG 或 JPEG 3. 圖片大小是否 < 1MB 4. LINE_CHANNEL_ACCESS_TOKEN 是否正確設定'
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}

