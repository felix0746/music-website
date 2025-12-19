/**
 * 創建簡單的 Rich Menu 並上傳圖片
 * 
 * 這個腳本會：
 * 1. 創建 Rich Menu
 * 2. 生成一個簡單的單色圖片
 * 3. 上傳圖片
 * 4. 設定為預設
 */

const { Client } = require('@line/bot-sdk')
const fs = require('fs')
const path = require('path')
const { createCanvas } = require('canvas')
const dotenv = require('dotenv')

// 載入環境變數
dotenv.config({ path: path.join(__dirname, '.env.local') })

const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
})

// Rich Menu 定義
const richMenu = {
  size: {
    width: 2500,
    height: 1686
  },
  selected: true,
  name: 'MyMusic 主選單',
  chatBarText: '選單',
  areas: [
    { bounds: { x: 0, y: 0, width: 833, height: 843 }, action: { type: 'postback', data: 'action=courses', label: '課程介紹' } },
    { bounds: { x: 833, y: 0, width: 834, height: 843 }, action: { type: 'postback', data: 'action=my_enrollment', label: '我的報名' } },
    { bounds: { x: 1667, y: 0, width: 833, height: 843 }, action: { type: 'postback', data: 'action=payment_info', label: '付款資訊' } },
    { bounds: { x: 0, y: 843, width: 833, height: 843 }, action: { type: 'postback', data: 'action=payment_report', label: '付款回報' } },
    { bounds: { x: 833, y: 843, width: 834, height: 843 }, action: { type: 'postback', data: 'action=cancel_course', label: '取消/退費' } },
    { bounds: { x: 1667, y: 843, width: 833, height: 843 }, action: { type: 'postback', data: 'action=contact', label: '聯絡老師' } }
  ]
}

// 按鈕文字
const buttons = [
  { text: '課程介紹', x: 0, y: 0 },
  { text: '我的報名', x: 833, y: 0 },
  { text: '付款資訊', x: 1667, y: 0 },
  { text: '付款回報', x: 0, y: 843 },
  { text: '取消/退費', x: 833, y: 843 },
  { text: '聯絡老師', x: 1667, y: 843 }
]

async function createAndUploadRichMenu() {
  try {
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      console.error('❌ 錯誤：請設定 LINE_CHANNEL_ACCESS_TOKEN 環境變數')
      process.exit(1)
    }

    console.log('🚀 開始創建 Rich Menu...')

    // 1. 創建 Rich Menu
    console.log('📝 創建 Rich Menu 定義...')
    const richMenuId = await lineClient.createRichMenu(richMenu)
    console.log('✅ Rich Menu 創建成功！')
    console.log(`   Rich Menu ID: ${richMenuId}`)

    // 2. 生成簡單圖片
    console.log('🎨 生成簡單圖片...')
    const canvas = createCanvas(2500, 1686)
    const ctx = canvas.getContext('2d')

    // 背景（白色到淺藍色漸層）
    const gradient = ctx.createLinearGradient(0, 0, 2500, 1686)
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(1, '#f0f9ff')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 2500, 1686)

    // 繪製按鈕
    buttons.forEach((button) => {
      // 按鈕背景
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(button.x, button.y, button.x === 833 ? 834 : 833, 843)

      // 邊框
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 4
      ctx.strokeRect(button.x, button.y, button.x === 833 ? 834 : 833, 843)

      // 文字
      ctx.fillStyle = '#1e40af'
      ctx.font = 'bold 64px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(button.text, button.x + (button.x === 833 ? 417 : 416.5), button.y + 421.5)
    })

    // 儲存圖片
    const imageBuffer = canvas.toBuffer('image/png')
    const imagePath = path.join(__dirname, 'rich-menu-temp.png')
    fs.writeFileSync(imagePath, imageBuffer)
    console.log(`✅ 圖片已生成: ${imagePath}`)
    console.log(`   檔案大小: ${(imageBuffer.length / 1024).toFixed(2)} KB`)

    // 3. 上傳圖片
    console.log('📤 上傳圖片到 LINE...')
    await lineClient.setRichMenuImage(richMenuId, imageBuffer)
    console.log('✅ 圖片上傳成功！')

    // 4. 設定為預設
    console.log('⚙️  設定為預設 Rich Menu...')
    await lineClient.setDefaultRichMenu(richMenuId)
    console.log('✅ 已設定為預設 Rich Menu！')

    // 5. 清理臨時檔案
    fs.unlinkSync(imagePath)
    console.log('🧹 已清理臨時檔案')

    console.log('\n✨ 完成！Rich Menu 已創建、上傳並設定為預設。')
    console.log(`\n📋 Rich Menu ID: ${richMenuId}`)
    console.log('現在可以在 LINE 中看到 Rich Menu 了！')

    return richMenuId

  } catch (error) {
    console.error('❌ 發生錯誤:', error.message)
    if (error.originalError) {
      console.error('詳細錯誤:', error.originalError.response?.data || error.originalError)
    }
    process.exit(1)
  }
}

// 執行
if (require.main === module) {
  createAndUploadRichMenu()
}

module.exports = { createAndUploadRichMenu }

