# 創建 Rich Menu 步驟

## 方法一：使用瀏覽器 Console（推薦）

1. 打開瀏覽器開發者工具（F12）
2. 切換到「Console」標籤
3. 輸入 `allow pasting` 並按 Enter（如果看到警告）
4. 貼上並執行以下代碼：

```javascript
fetch('https://music-website-six-opal.vercel.app/api/admin/rich-menu', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'create_and_set'
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Rich Menu 創建結果:', data)
  if (data.success) {
    alert('Rich Menu 創建成功！\n\nRich Menu ID: ' + data.richMenuId + '\n\n請到 LINE Developers Console 上傳圖片')
    console.log('\n📋 下一步：')
    console.log('1. 訪問: https://developers.line.biz/console/')
    console.log('2. 進入您的 Channel → Messaging API → Rich Menu')
    console.log('3. 找到 Rich Menu ID: ' + data.richMenuId)
    console.log('4. 點擊「上傳圖片」（2500 x 1686 像素）')
  } else {
    alert('創建失敗：' + (data.error || '未知錯誤'))
  }
})
.catch(err => {
  console.error('❌ 錯誤:', err)
  alert('請求失敗，請檢查網路連線')
})
```

## 方法二：使用 curl（命令列）

```bash
curl -X POST https://music-website-six-opal.vercel.app/api/admin/rich-menu \
  -H "Content-Type: application/json" \
  -d '{"action": "create_and_set"}'
```

## 方法三：使用 Postman 或類似工具

- **方法**：POST
- **URL**：`https://music-website-six-opal.vercel.app/api/admin/rich-menu`
- **Headers**：`Content-Type: application/json`
- **Body** (JSON)：
```json
{
  "action": "create_and_set"
}
```

## 創建成功後

1. 您會收到 Rich Menu ID
2. 訪問 LINE Developers Console：https://developers.line.biz/console/
3. 進入您的 Channel → Messaging API → Rich Menu
4. 找到剛創建的 Rich Menu（會顯示 Rich Menu ID）
5. 點擊「上傳圖片」
6. 上傳您的圖片（2500 x 1686 像素，PNG 或 JPEG，< 1MB）

## 如果遇到錯誤

- **404 錯誤**：確認檔案已推送到 Git 並部署到 Vercel
- **500 錯誤**：檢查環境變數 `LINE_CHANNEL_ACCESS_TOKEN` 是否已設定
- **認證錯誤**：確認 LINE Channel Access Token 有效

