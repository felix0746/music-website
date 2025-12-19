/**
 * Rich Menu 創建腳本
 * 
 * 使用方法：
 * node scripts/create-rich-menu.js
 * 
 * 或使用環境變數：
 * LINE_CHANNEL_ACCESS_TOKEN=your_token node scripts/create-rich-menu.js
 */

const { Client } = require('@line/bot-sdk')
const dotenv = require('dotenv')
const path = require('path')

// 載入環境變數
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
})

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
      bounds: { x: 834, y: 0, width: 833, height: 843 },
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
      bounds: { x: 0, y: 844, width: 833, height: 843 },
      action: {
        type: 'postback',
        data: 'action=payment_report',
        label: '付款回報'
      }
    },
    {
      bounds: { x: 834, y: 844, width: 833, height: 843 },
      action: {
        type: 'postback',
        data: 'action=cancel_course',
        label: '取消/退費'
      }
    },
    {
      bounds: { x: 1667, y: 844, width: 833, height: 843 },
      action: {
        type: 'postback',
        data: 'action=contact',
        label: '聯絡老師'
      }
    }
  ]
}

async function createRichMenu() {
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

    // 2. 設定為預設 Rich Menu
    console.log('⚙️  設定為預設 Rich Menu...')
    await lineClient.setDefaultRichMenu(richMenuId)
    console.log('✅ 已設定為預設 Rich Menu！')

    console.log('\n📋 下一步：')
    console.log('1. 準備 Rich Menu 圖片（2500 x 1686 像素，PNG 或 JPEG，< 1MB）')
    console.log('2. 使用以下方式上傳圖片：')
    console.log('   - 方法一：使用 LINE Developers Console')
    console.log('     https://developers.line.biz/console/')
    console.log('     進入您的 Channel → Messaging API → Rich Menu')
    console.log(`     找到 Rich Menu ID: ${richMenuId}`)
    console.log('     點擊「上傳圖片」')
    console.log('   - 方法二：使用 API（如果圖片在網路上）')
    console.log(`     POST /api/admin/rich-menu`)
    console.log(`     {"action": "upload_image", "richMenuId": "${richMenuId}", "imageUrl": "圖片URL"}`)
    console.log('\n✨ Rich Menu 創建完成！')

    return richMenuId
  } catch (error) {
    console.error('❌ 創建 Rich Menu 時發生錯誤:', error.message)
    if (error.originalError) {
      console.error('詳細錯誤:', error.originalError.response?.data || error.originalError)
    }
    process.exit(1)
  }
}

// 執行
if (require.main === module) {
  createRichMenu()
}

module.exports = { createRichMenu }

