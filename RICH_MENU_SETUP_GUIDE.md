# Rich Menu 完整設定指南

## 📋 概述

本指南將幫助您完成 Rich Menu 的設定，讓 LINE Bot 顯示圖文選單。

## 🎯 完整操作步驟

### 步驟 1：檢查現有的 Rich Menu

1. 打開 `check-rich-menu.html` 頁面
2. 點擊「檢查 Rich Menu 列表」按鈕
3. 查看返回的 Rich Menu 列表
4. **記下一個存在的 Rich Menu ID**（例如：`richmenu-cb5911a53b3528885886074bb488888`）

### 步驟 2：確認 Rich Menu 是否已上傳圖片

**重要**：Rich Menu 必須先上傳圖片才能設定為預設。

檢查方法：
- 在檢查工具中，每個 Rich Menu 卡片會顯示資訊
- 如果 Rich Menu 沒有圖片，需要先上傳

### 步驟 3：上傳 Rich Menu 圖片

#### 方法一：使用上傳工具（推薦）

1. 打開 `upload-rich-menu.html` 頁面
2. 在「Rich Menu ID」輸入框中，**貼上步驟 1 記下的 Rich Menu ID**
3. 點擊「選擇檔案」，選擇您的 Rich Menu 圖片
   - 圖片規格：
     - 尺寸：2500 x 1686 像素
     - 格式：PNG 或 JPEG
     - 大小：< 1MB
4. 點擊「上傳圖片」按鈕
5. 等待上傳完成

#### 方法二：使用 LINE Developers Console

1. 訪問：https://developers.line.biz/console/
2. 登入您的 LINE Channel
3. 進入「Messaging API」→「Rich Menu」
4. 找到您的 Rich Menu（使用 Rich Menu ID 搜尋）
5. 點擊「上傳圖片」
6. 選擇圖片檔案並上傳

### 步驟 4：設定為預設 Rich Menu

#### 方法一：使用檢查工具（推薦）

1. 在 `check-rich-menu.html` 頁面中
2. 點擊「檢查 Rich Menu 列表」
3. 找到您要使用的 Rich Menu
4. 點擊該 Rich Menu 卡片上的「設為預設」按鈕
5. 等待設定完成

#### 方法二：使用上傳工具

1. 在 `upload-rich-menu.html` 頁面中
2. 上傳圖片成功後，會顯示「設定為預設 Rich Menu」按鈕
3. 點擊該按鈕

#### 方法三：使用 API

在瀏覽器 Console 中執行：

```javascript
fetch('https://music-website-six-opal.vercel.app/api/admin/rich-menu', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'set_default',
    richMenuId: 'YOUR_RICH_MENU_ID' // 替換為您的 Rich Menu ID
  })
})
.then(res => res.json())
.then(data => {
  console.log('設定結果:', data)
  if (data.success) {
    alert('✅ Rich Menu 已設定為預設！')
  }
})
```

### 步驟 5：在 LINE 中查看效果

1. **完全關閉 LINE 應用程式**（不是只切換，要完全關閉）
2. 重新打開 LINE
3. 進入您的 LINE Bot 聊天視窗
4. 應該會在底部看到 Rich Menu（圖文選單）

如果還是沒有顯示：
- 等待 1-2 分鐘讓 LINE 更新
- 確認 LINE 應用程式已更新到最新版本
- 確認您已加入 LINE Bot 為好友

## 🔧 常見問題排除

### 問題 1：上傳時顯示「Rich Menu 不存在或無效」

**解決方案**：
1. 在檢查工具中重新檢查 Rich Menu 列表
2. 確認您使用的 Rich Menu ID 是否正確
3. 如果 ID 不正確，從列表中選擇正確的 ID
4. 如果所有 Rich Menu 都不存在，創建一個新的 Rich Menu

### 問題 2：設定為預設後，LINE 中還是看不到 Rich Menu

**解決方案**：
1. 確認 Rich Menu 已上傳圖片（必須先上傳圖片才能設定為預設）
2. 完全關閉並重新打開 LINE 應用程式
3. 等待幾分鐘讓 LINE 更新
4. 確認 LINE 應用程式已更新到最新版本

### 問題 3：找不到 Rich Menu 列表

**解決方案**：
1. 確認 `LINE_CHANNEL_ACCESS_TOKEN` 環境變數已正確設定
2. 確認 Token 未過期
3. 檢查 Vercel 部署日誌是否有錯誤

### 問題 4：Rich Menu 圖片上傳失敗

**解決方案**：
1. 確認圖片尺寸為 2500 x 1686 像素
2. 確認圖片格式為 PNG 或 JPEG
3. 確認圖片大小 < 1MB
4. 如果圖片太大，使用圖片編輯軟體壓縮

## 📝 快速檢查清單

- [ ] 已檢查 Rich Menu 列表
- [ ] 已選擇一個存在的 Rich Menu ID
- [ ] 已準備好符合規格的圖片（2500x1686，PNG/JPEG，< 1MB）
- [ ] 已上傳 Rich Menu 圖片
- [ ] 已設定為預設 Rich Menu
- [ ] 已重新打開 LINE 應用程式
- [ ] 在 LINE Bot 中可以看到 Rich Menu

## 🎨 Rich Menu 圖片設計建議

1. **按鈕區域對齊**：
   - 第一排：y=0, 高度=843
   - 第二排：y=843, 高度=843
   - 每個按鈕寬度：833 或 834

2. **文字清晰**：
   - 使用對比度高的顏色
   - 字體大小適中
   - 避免在按鈕邊界放置重要內容

3. **視覺設計**：
   - 保持簡潔明瞭
   - 使用品牌色彩
   - 確保在手機上清晰可見

## 📞 需要幫助？

如果遇到問題：
1. 檢查瀏覽器 Console 的錯誤訊息
2. 檢查 Vercel 部署日誌
3. 確認所有環境變數已正確設定
4. 參考 LINE Developers 官方文檔：https://developers.line.biz/en/docs/messaging-api/using-rich-menus/

