# Rich Menu 功能測試指南

## 🧪 快速測試方法

### 方法一：使用測試工具（最簡單）

1. 打開 `test-functions.html` 檔案
2. 在瀏覽器中開啟
3. 點擊各個按鈕測試功能
4. 查看測試結果

### 方法二：使用瀏覽器 Console

在瀏覽器 Console 中執行以下代碼：

```javascript
// 測試所有功能
const actions = ['courses', 'my_enrollment', 'payment_info', 'payment_report', 'cancel_course', 'contact'];

actions.forEach(async (action) => {
  const response = await fetch('https://music-website-six-opal.vercel.app/api/line-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      events: [{
        type: 'postback',
        source: { userId: 'test-user' },
        postback: { data: `action=${action}` },
        replyToken: `test-${Date.now()}`
      }]
    })
  });
  
  const result = await response.json();
  console.log(`${action}:`, result.success ? '✅ 成功' : '❌ 失敗', result);
});
```

### 方法三：使用 LINE 測試工具

1. 在 LINE Developers Console 中
2. 找到「Messaging API」→「Webhook」測試工具
3. 發送 Postback 事件測試

## 📋 功能測試清單

| 功能 | Postback Data | 預期行為 |
|------|---------------|----------|
| 課程介紹 | `action=courses` | 顯示所有課程資訊 |
| 我的報名 | `action=my_enrollment` | 顯示報名狀態 |
| 付款資訊 | `action=payment_info` | 顯示付款資訊 |
| 付款回報 | `action=payment_report` | 顯示付款回報引導 |
| 取消/退費 | `action=cancel_course` | 顯示取消課程引導 |
| 聯絡老師 | `action=contact` | 顯示聯絡資訊 |

## ✅ 測試結果判斷

### 成功指標
- API 返回 `{success: true}`
- 沒有錯誤訊息
- 功能正常執行

### 失敗原因
- LINE_CHANNEL_ACCESS_TOKEN 未設定
- Webhook URL 未正確設定
- Postback 事件格式錯誤

## 🔧 故障排除

### 如果測試失敗

1. **檢查環境變數**
   - 確認 Vercel 中已設定 `LINE_CHANNEL_ACCESS_TOKEN`

2. **檢查 Webhook**
   - 確認 Webhook URL 正確
   - 確認 Webhook 已啟用

3. **檢查日誌**
   - 查看 Vercel 部署日誌
   - 查看 LINE Developers Console 的 Webhook 日誌

## 📝 測試後續步驟

1. ✅ 確認所有功能正常
2. ⏳ 上傳 Rich Menu 圖片（可選）
3. ⏳ 設定為預設 Rich Menu（需要圖片）

