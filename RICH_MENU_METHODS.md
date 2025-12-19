# Rich Menu 創建和管理方法總覽

## 方法一：使用 LINE Official Account Manager（最簡單）

### 優點
- ✅ 圖形化介面，操作簡單
- ✅ 可以直接上傳圖片
- ✅ 可以視覺化設定按鈕區域
- ✅ 即時預覽效果

### 步驟
1. 訪問：https://manager.line.biz/
2. 登入您的 LINE Official Account
3. 進入「擴充功能」→「圖文選單」
4. 點擊「建立圖文選單」
5. 設定標題、使用期間
6. 選擇版型（3x2）
7. 上傳圖片
8. 設定按鈕區域和 Postback Data
9. 儲存並啟用

---

## 方法二：使用我們的 API（已實作）

### 優點
- ✅ 已整合到您的系統
- ✅ 可以程式化管理
- ✅ 可以批次操作

### 已創建的 Rich Menu
- **Rich Menu ID**: `richmenu-a6389c5b70cb89ab3df24a986c5c3302`
- **狀態**: 已創建，等待上傳圖片

### API 端點

#### 1. 查詢 Rich Menu 列表
```javascript
fetch('https://music-website-six-opal.vercel.app/api/admin/rich-menu')
  .then(res => res.json())
  .then(data => console.log(data))
```

#### 2. 設定為預設（上傳圖片後）
```javascript
fetch('https://music-website-six-opal.vercel.app/api/admin/rich-menu', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'set_default',
    richMenuId: 'richmenu-a6389c5b70cb89ab3df24a986c5c3302'
  })
})
```

#### 3. 上傳圖片（如果圖片在網路上）
```javascript
fetch('https://music-website-six-opal.vercel.app/api/admin/rich-menu', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'upload_image',
    richMenuId: 'richmenu-a6389c5b70cb89ab3df24a986c5c3302',
    imageUrl: 'https://your-image-url.com/rich-menu.png'
  })
})
```

---

## 方法三：使用 LINE Developers Console（如果找得到）

### 步驟
1. 訪問：https://developers.line.biz/console/
2. 進入您的 Channel → Messaging API
3. 尋找「Rich Menu」區塊
4. 點擊「建立 Rich Menu」
5. 設定配置
6. 上傳圖片

### 注意
- 如果找不到 Rich Menu 選項，可能需要：
  - 啟用 Messaging API
  - 確認權限
  - 或使用其他方法

---

## 方法四：使用 LINE CLI 工具

### 安裝 LINE CLI
```bash
npm install -g @line/cli
```

### 使用 CLI 創建
```bash
line richmenu create --name "MyMusic 主選單" --size 2500x1686
```

### 上傳圖片
```bash
line richmenu upload-image <richMenuId> <imagePath>
```

### 設定為預設
```bash
line richmenu set-default <richMenuId>
```

---

## 方法五：使用 Postman 或類似工具

### 步驟
1. 安裝 Postman
2. 設定 LINE Messaging API 端點
3. 使用 LINE API 直接調用

### LINE Rich Menu API 端點
- 創建：`POST https://api.line.me/v2/bot/richmenu`
- 上傳圖片：`POST https://api-data.line.me/v2/bot/richmenu/{richMenuId}/content`
- 設定預設：`POST https://api.line.me/v2/bot/user/all/richmenu/{richMenuId}`

### 需要設定
- Header: `Authorization: Bearer {YOUR_CHANNEL_ACCESS_TOKEN}`
- Content-Type: `application/json`（創建時）或 `image/png`（上傳圖片時）

---

## 方法六：暫時跳過圖片，先測試功能

### 優點
- ✅ 可以立即測試功能
- ✅ 不需要等待圖片設計
- ✅ 功能已經可以運作

### 測試方式

#### 1. 直接測試 Postback 功能
即使沒有 Rich Menu 圖片，也可以透過模擬 Postback 事件來測試：

```javascript
// 在瀏覽器 Console 中測試
fetch('https://music-website-six-opal.vercel.app/api/line-webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    events: [{
      type: 'postback',
      source: { userId: 'test-user' },
      postback: { data: 'action=courses' },
      replyToken: 'test-token'
    }]
  })
})
```

#### 2. 使用 LINE 測試工具
- 在 LINE Developers Console 中
- 使用 Webhook 測試工具發送 Postback 事件

---

## 推薦方案

### 如果您想要：
- **最簡單快速** → 使用方法一（LINE Official Account Manager）
- **程式化管理** → 使用方法二（我們的 API）
- **命令行操作** → 使用方法四（LINE CLI）
- **先測試功能** → 使用方法六（跳過圖片，直接測試）

---

## 目前狀態

✅ **Rich Menu 已創建**
- ID: `richmenu-a6389c5b70cb89ab3df24a986c5c3302`
- 所有功能已實作完成
- Postback 事件處理已就緒

⏳ **待完成**
- 上傳圖片（可選，功能已可運作）
- 設定為預設（需要先上傳圖片）

---

## 建議

1. **先測試功能**：使用 Postback 事件測試所有功能是否正常
2. **再上傳圖片**：功能確認無誤後，再上傳圖片
3. **最後設定預設**：圖片上傳後，設定為預設 Rich Menu

這樣可以確保功能正常運作，圖片可以稍後處理。

