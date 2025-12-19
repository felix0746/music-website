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

    // 驗證參數，提供更詳細的錯誤訊息
    if (!richMenuId || (typeof richMenuId === 'string' && richMenuId.trim() === '')) {
      return Response.json(
        { 
          success: false,
          error: '缺少 richMenuId 參數',
          hint: '請先選擇或創建 Rich Menu，然後再上傳圖片'
        },
        { status: 400 }
      )
    }

    if (!imageFile || imageFile.size === 0) {
      return Response.json(
        { 
          success: false,
          error: '缺少 image 檔案',
          hint: '請選擇一個圖片檔案（PNG 或 JPEG，< 1MB）'
        },
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

    // 檢查 Rich Menu 是否存在
    const lineClientInstance = getLineClient()
    try {
      const richMenuList = await lineClientInstance.getRichMenuList()
      const richMenus = richMenuList.richmenus || richMenuList || []
      const richMenuExists = richMenus.some(rm => rm.richMenuId === richMenuId)
      
      if (!richMenuExists) {
        // 收集所有可用的 Rich Menu ID 用於錯誤訊息
        const availableIds = richMenus.map(rm => rm.richMenuId).slice(0, 5) // 只顯示前 5 個
        
        return Response.json(
          { 
            success: false,
            error: 'Rich Menu 不存在',
            details: `找不到 Rich Menu ID: ${richMenuId}`,
            availableRichMenuIds: availableIds,
            totalCount: richMenus.length,
            hint: availableIds.length > 0 
              ? `請確認 Rich Menu ID 是否正確。目前可用的 Rich Menu ID：${availableIds.join(', ')}`
              : '請先創建 Rich Menu，然後再上傳圖片。您可以使用 /api/admin/rich-menu 的 create action 創建。'
          },
          { status: 400 }
        )
      }
      
      console.log(`Rich Menu 存在性檢查通過: ${richMenuId}`)
    } catch (checkError) {
      console.error('檢查 Rich Menu 時發生錯誤:', checkError)
      // 如果檢查失敗，記錄錯誤但繼續嘗試上傳（可能是 API 暫時性問題）
      console.warn('繼續嘗試上傳，但 Rich Menu 存在性檢查失敗')
    }

    // 上傳圖片到 LINE
    try {
      await lineClientInstance.setRichMenuImage(richMenuId, buffer)
      console.log(`Rich Menu 圖片上傳成功: ${richMenuId}`)
    } catch (uploadError) {
      // 處理 LINE API 的特定錯誤
      const statusCode = uploadError.originalError?.response?.status || 500
      const errorData = uploadError.originalError?.response?.data || {}
      
      console.error('LINE API 上傳錯誤:', {
        statusCode,
        errorData,
        message: uploadError.message,
        richMenuId
      })
      
      if (statusCode === 400 || statusCode === 404) {
        // 再次嘗試獲取 Rich Menu 列表以提供更詳細的錯誤訊息
        let availableIds = []
        try {
          const richMenuList = await lineClientInstance.getRichMenuList()
          const richMenus = richMenuList.richmenus || richMenuList || []
          availableIds = richMenus.map(rm => rm.richMenuId).slice(0, 5)
        } catch (listError) {
          console.error('獲取 Rich Menu 列表失敗:', listError)
        }
        
        return Response.json(
          { 
            success: false,
            error: 'Rich Menu 不存在或無效',
            details: errorData.message || uploadError.message || `LINE API 返回 ${statusCode} 錯誤`,
            availableRichMenuIds: availableIds.length > 0 ? availableIds : undefined,
            hint: availableIds.length > 0
              ? `Rich Menu ID "${richMenuId}" 不存在。可用的 Rich Menu ID：${availableIds.join(', ')}`
              : `Rich Menu ID "${richMenuId}" 可能不存在。請先創建 Rich Menu，然後再上傳圖片。`
          },
          { status: 400 }
        )
      }
      
      throw uploadError // 重新拋出其他錯誤
    }

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

