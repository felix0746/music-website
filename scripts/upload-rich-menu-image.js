/**
 * Rich Menu 圖片上傳腳本
 * 
 * 使用方法：
 * node scripts/upload-rich-menu-image.js <richMenuId> <imagePath>
 * 
 * 例如：
 * node scripts/upload-rich-menu-image.js richmenu-a6389c5b70cb89ab3df24a986c5c3302 ./rich-menu.png
 */

const { Client } = require('@line/bot-sdk')
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

// 載入環境變數
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
})

async function uploadRichMenuImage(richMenuId, imagePath) {
  try {
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      console.error('❌ 錯誤：請設定 LINE_CHANNEL_ACCESS_TOKEN 環境變數')
      process.exit(1)
    }

    if (!richMenuId || !imagePath) {
      console.error('❌ 錯誤：請提供 Rich Menu ID 和圖片路徑')
      console.log('使用方法：node scripts/upload-rich-menu-image.js <richMenuId> <imagePath>')
      process.exit(1)
    }

    // 檢查檔案是否存在
    const fullPath = path.isAbsolute(imagePath) ? imagePath : path.join(__dirname, '..', imagePath)
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ 錯誤：圖片檔案不存在: ${fullPath}`)
      process.exit(1)
    }

    // 讀取圖片檔案
    console.log('📤 讀取圖片檔案...')
    const imageBuffer = fs.readFileSync(fullPath)
    const fileSize = (imageBuffer.length / 1024).toFixed(2)
    console.log(`   檔案大小: ${fileSize} KB`)

    // 驗證檔案大小
    if (imageBuffer.length > 1024 * 1024) {
      console.error('❌ 錯誤：檔案大小超過 1MB，請壓縮後再上傳')
      process.exit(1)
    }

    // 上傳圖片
    console.log(`📤 上傳圖片到 Rich Menu: ${richMenuId}...`)
    await lineClient.setRichMenuImage(richMenuId, imageBuffer)
    console.log('✅ 圖片上傳成功！')

    // 設定為預設（可選）
    console.log('⚙️  設定為預設 Rich Menu...')
    try {
      await lineClient.setDefaultRichMenu(richMenuId)
      console.log('✅ 已設定為預設 Rich Menu！')
    } catch (error) {
      console.log('⚠️  設定為預設失敗（可能需要等待圖片處理完成）:', error.message)
    }

    console.log('\n✨ 完成！Rich Menu 已上傳並設定為預設。')

  } catch (error) {
    console.error('❌ 上傳圖片時發生錯誤:', error.message)
    if (error.originalError) {
      console.error('詳細錯誤:', error.originalError.response?.data || error.originalError)
    }
    process.exit(1)
  }
}

// 執行
const richMenuId = process.argv[2]
const imagePath = process.argv[3]

if (require.main === module) {
  uploadRichMenuImage(richMenuId, imagePath)
}

module.exports = { uploadRichMenuImage }

