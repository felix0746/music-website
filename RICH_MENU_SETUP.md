# Rich Menu 設定指南

## 📋 概述

Rich Menu 是 LINE Bot 的圖文選單功能，讓用戶可以透過點擊按鈕快速操作，而不需要輸入文字。

## 🎨 Rich Menu 設計規格

### 配置
- **尺寸**：2500 x 1686 像素（3x2 配置）
- **格式**：PNG 或 JPEG
- **檔案大小**：最大 1 MB

### 按鈕配置（3x2）

```
┌─────────┬─────────┬─────────┐
│ 課程介紹 │ 我的報名 │ 付款資訊 │
├─────────┼─────────┼─────────┤
│ 付款回報 │取消/退費 │聯絡老師 │
└─────────┴─────────┴─────────┘
```

### 按鈕位置（座標）

| 按鈕 | X | Y | 寬度 | 高度 | Postback Data |
|------|---|---|------|------|---------------|
| 課程介紹 | 0 | 0 | 833 | 843 | `action=courses` |
| 我的報名 | 834 | 0 | 833 | 843 | `action=my_enrollment` |
| 付款資訊 | 1667 | 0 | 833 | 843 | `action=payment_info` |
| 付款回報 | 0 | 844 | 833 | 843 | `action=payment_report` |
| 取消/退費 | 834 | 844 | 833 | 843 | `action=cancel_course` |
| 聯絡老師 | 1667 | 844 | 833 | 843 | `action=contact` |

## 🚀 設定步驟

### 方法一：使用 API（推薦）

1. **創建 Rich Menu**
```bash
curl -X POST https://your-domain.com/api/admin/rich-menu \
  -H "Content-Type: application/json" \
  -d '{"action": "create"}'
```

2. **上傳 Rich Menu 圖片**
   - 使用 LINE Developers Console 上傳圖片
   - 或使用 LINE Messaging API 上傳圖片

3. **設定為預設 Rich Menu**
```bash
curl -X POST https://your-domain.com/api/admin/rich-menu \
  -H "Content-Type: application/json" \
  -d '{"action": "set_default", "richMenuId": "YOUR_RICH_MENU_ID"}'
```

### 方法二：使用 LINE Developers Console

1. 登入 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇您的 Channel
3. 進入「Messaging API」→「Rich Menu」
4. 點擊「建立 Rich Menu」
5. 上傳圖片（2500 x 1686 像素）
6. 設定按鈕區域和 Postback Data
7. 設定為預設 Rich Menu

## 📝 Postback Data 格式

所有按鈕使用 `action=value` 格式：

- `action=courses` - 課程介紹
- `action=my_enrollment` - 我的報名
- `action=payment_info` - 付款資訊
- `action=payment_report` - 付款回報
- `action=cancel_course` - 取消/退費
- `action=contact` - 聯絡老師

## 🎨 設計建議

### 配色方案（符合網站風格）
- **主色**：深藍色 (#2563EB, blue-600)
- **背景**：白色或淺藍色漸層
- **文字**：深灰色或深藍色
- **避免**：粉色系

### 按鈕設計
- 每個按鈕區域應有清晰的邊界
- 使用圖示 + 文字的方式
- 保持一致的視覺風格
- 確保文字清晰可讀

### 圖片資源
- 建議使用設計工具（如 Figma、Photoshop）創建
- 確保圖片解析度足夠（2500 x 1686）
- 優化圖片大小（壓縮後 < 1MB）

## 🔧 API 端點

### GET /api/admin/rich-menu
取得所有 Rich Menu 列表

### POST /api/admin/rich-menu
創建或設定 Rich Menu
- `{"action": "create"}` - 創建 Rich Menu
- `{"action": "set_default", "richMenuId": "xxx"}` - 設定預設
- `{"action": "set_user", "userId": "xxx", "richMenuId": "xxx"}` - 為用戶設定

### DELETE /api/admin/rich-menu?richMenuId=xxx
刪除 Rich Menu

## ⚠️ 注意事項

1. **圖片上傳**：Rich Menu 圖片必須透過 LINE Messaging API 或 Developers Console 上傳，無法透過我們的 API 直接上傳
2. **用戶限制**：每個用戶最多只能有一個 Rich Menu
3. **預設 Rich Menu**：設定為預設後，所有新加入的用戶都會自動看到
4. **測試**：建議先在測試環境測試 Rich Menu 功能

## 📚 參考資源

- [LINE Rich Menu 官方文件](https://developers.line.biz/en/docs/messaging-api/using-rich-menus/)
- [Rich Menu 設計指南](https://developers.line.biz/en/docs/messaging-api/rich-menu/)

