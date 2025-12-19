import { Client } from '@line/bot-sdk'
import fs from 'fs'
import path from 'path'

let lineClient

function getLineClient() {
  if (!lineClient) {
    lineClient = new Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
    })
  }
  return lineClient
}

// GET: 取得 Rich Menu 列表
export async function GET() {
  try {
    const lineClientInstance = getLineClient()
    const response = await lineClientInstance.getRichMenuList()
    
    // LINE SDK 返回的格式可能是 { richmenus: [...] } 或直接是陣列
    const richMenus = response.richmenus || response || []
    
    console.log('Rich Menu 查詢結果:', {
      responseType: typeof response,
      hasRichmenus: !!response.richmenus,
      count: Array.isArray(richMenus) ? richMenus.length : 0,
      rawResponse: JSON.stringify(response).substring(0, 200)
    })
    
    return Response.json({
      success: true,
      count: Array.isArray(richMenus) ? richMenus.length : 0,
      richMenus: richMenus,
      rawResponse: response // 用於調試
    })
  } catch (error) {
    console.error('取得 Rich Menu 列表時發生錯誤:', error)
    const errorDetails = error.originalError?.response?.data || error.message || error.stack
    
    return Response.json(
      { 
        success: false,
        error: '取得 Rich Menu 列表失敗: ' + error.message,
        details: errorDetails,
        hint: '請檢查：1. LINE_CHANNEL_ACCESS_TOKEN 是否正確設定 2. LINE API 是否正常運作'
      },
      { status: 500 }
    )
  }
}

// POST: 創建 Rich Menu
export async function POST(request) {
  try {
    // 先檢查 Content-Type 來決定如何讀取 body
    const contentType = request.headers.get('content-type') || ''
    
    let bodyData = null
    let formData = null
    
    // 根據 Content-Type 讀取 body（只能讀取一次）
    if (contentType.includes('multipart/form-data')) {
      // FormData 格式
      formData = await request.formData()
    } else {
      // JSON 格式
      bodyData = await request.json()
    }
    
    const action = bodyData?.action || formData?.get('action')
    const lineClientInstance = getLineClient()

    if (action === 'create') {
      // 創建 Rich Menu
      const richMenu = await createRichMenu(lineClientInstance)
      return Response.json({
        success: true,
        message: 'Rich Menu 創建成功',
        richMenuId: richMenu.richMenuId,
        note: '請使用 upload_image action 上傳圖片，或使用 LINE Developers Console 上傳'
      })
    } else if (action === 'upload_image') {
      // 上傳 Rich Menu 圖片
      // 支援兩種方式：1. JSON 格式（imageUrl） 2. FormData 格式（直接上傳檔案）
      
      if (formData) {
        // 方式一：直接上傳檔案（FormData）
        const richMenuId = formData.get('richMenuId')
        const imageFile = formData.get('image')
        
        if (!richMenuId || !imageFile) {
          return Response.json(
            { error: '缺少 richMenuId 或 image 參數' },
            { status: 400 }
          )
        }
        
        // 將檔案轉換為 Buffer
        const arrayBuffer = await imageFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        await lineClientInstance.setRichMenuImage(richMenuId, buffer)
        return Response.json({
          success: true,
          message: 'Rich Menu 圖片上傳成功',
          richMenuId: richMenuId,
          fileName: imageFile.name,
          fileSize: buffer.length
        })
      } else if (bodyData) {
        // 方式二：使用圖片 URL（JSON 格式）
        const { richMenuId, imageUrl } = bodyData
        if (!richMenuId) {
          return Response.json(
            { error: '缺少 richMenuId 參數' },
            { status: 400 }
          )
        }
        await uploadRichMenuImage(lineClientInstance, richMenuId, imageUrl)
        return Response.json({
          success: true,
          message: 'Rich Menu 圖片上傳成功'
        })
      } else {
        return Response.json(
          { error: '無法解析請求資料' },
          { status: 400 }
        )
      }
    } else if (action === 'create_and_set') {
      // 創建 Rich Menu（注意：必須先上傳圖片才能設定為預設）
      const richMenu = await createRichMenu(lineClientInstance)
      // 注意：不能立即設定為預設，必須先上傳圖片
      // await lineClientInstance.setDefaultRichMenu(richMenu.richMenuId)
      return Response.json({
        success: true,
        message: 'Rich Menu 創建成功！',
        richMenuId: richMenu.richMenuId,
        nextSteps: {
          step1: '使用 LINE Developers Console 上傳圖片（2500 x 1686 像素，PNG 或 JPEG，< 1MB）',
          step2: '上傳圖片後，使用 set_default action 設定為預設 Rich Menu',
          step3: `Rich Menu ID: ${richMenu.richMenuId}`,
          consoleUrl: 'https://developers.line.biz/console/',
          note: '必須先上傳圖片才能設定為預設 Rich Menu'
        }
      })
    } else if (action === 'set_default') {
      // 設定預設 Rich Menu
      const richMenuId = bodyData?.richMenuId || formData?.get('richMenuId')
      if (!richMenuId) {
        return Response.json(
          { error: '缺少 richMenuId 參數' },
          { status: 400 }
        )
      }
      await lineClientInstance.setDefaultRichMenu(richMenuId)
      return Response.json({
        success: true,
        message: '預設 Rich Menu 設定成功'
      })
    } else if (action === 'set_user') {
      // 為特定用戶設定 Rich Menu
      const userId = bodyData?.userId || formData?.get('userId')
      const richMenuId = bodyData?.richMenuId || formData?.get('richMenuId')
      if (!userId || !richMenuId) {
        return Response.json(
          { error: '缺少 userId 或 richMenuId 參數' },
          { status: 400 }
        )
      }
      await lineClientInstance.linkRichMenuToUser(userId, richMenuId)
      return Response.json({
        success: true,
        message: '用戶 Rich Menu 設定成功'
      })
    } else {
      return Response.json(
        { error: '無效的操作' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Rich Menu 操作時發生錯誤:', error)
    const errorMessage = error.message || '未知錯誤'
    const errorDetails = error.originalError?.response?.data || error.originalError?.message || error.stack
    
    return Response.json(
      { 
        error: 'Rich Menu 操作失敗: ' + errorMessage,
        details: errorDetails,
        hint: '請檢查：1. LINE_CHANNEL_ACCESS_TOKEN 是否正確設定 2. Rich Menu 配置是否符合 LINE API 規範'
      },
      { status: 500 }
    )
  }
}

// DELETE: 刪除 Rich Menu
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const richMenuId = searchParams.get('richMenuId')

    if (!richMenuId) {
      return Response.json(
        { error: '缺少 richMenuId 參數' },
        { status: 400 }
      )
    }

    const lineClientInstance = getLineClient()
    await lineClientInstance.deleteRichMenu(richMenuId)

    return Response.json({
      success: true,
      message: 'Rich Menu 刪除成功'
    })
  } catch (error) {
    console.error('刪除 Rich Menu 時發生錯誤:', error)
    return Response.json(
      { error: '刪除 Rich Menu 失敗: ' + error.message },
      { status: 500 }
    )
  }
}

// 創建 Rich Menu 定義
async function createRichMenu(lineClient) {
  // Rich Menu 定義（3x2 配置）
  // 尺寸：2500 x 1686
  // 每個按鈕：寬度 833，高度 843
  // 第一排：y=0, 第二排：y=843
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

  try {
    // 創建 Rich Menu
    const richMenuId = await lineClient.createRichMenu(richMenu)
    return { richMenuId }
  } catch (error) {
    console.error('創建 Rich Menu 詳細錯誤:', error)
    if (error.originalError) {
      console.error('原始錯誤:', error.originalError.response?.data || error.originalError)
    }
    throw error
  }
}

// 上傳 Rich Menu 圖片
async function uploadRichMenuImage(lineClient, richMenuId, imageUrl) {
  try {
    // 如果提供的是 URL，需要先下載圖片
    if (imageUrl.startsWith('http')) {
      const response = await fetch(imageUrl)
      const imageBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(imageBuffer)
      
      // 使用 LINE SDK 上傳圖片
      await lineClient.setRichMenuImage(richMenuId, buffer)
    } else {
      // 如果是本地檔案路徑
      const imagePath = path.join(process.cwd(), imageUrl)
      if (!fs.existsSync(imagePath)) {
        throw new Error('圖片檔案不存在: ' + imagePath)
      }
      const imageBuffer = fs.readFileSync(imagePath)
      await lineClient.setRichMenuImage(richMenuId, imageBuffer)
    }
  } catch (error) {
    console.error('上傳 Rich Menu 圖片時發生錯誤:', error)
    throw new Error('上傳圖片失敗: ' + error.message)
  }
}

