# LINE 報名系統設定指南

## 📱 LINE 官方帳號設定

### 1. 歡迎訊息設定
在 LINE Official Account Manager 中設定歡迎訊息：

```
🎵 歡迎來到 MyMusic 音樂課程！

我們提供以下課程：
• 歌唱課 - 學習如何愛上自己的歌聲
• 吉他課 - 從基礎到進階，養成寫作好習慣
• 創作課 - 探索音樂創作的奧秘
• 春曲創作團班 - 與同好交流，一起把創作帶上舞台

如需報名，請回覆「報名」開始流程！
```

### 2. Webhook 設定
在 LINE Developer Console 中：
- Webhook URL: `https://music-website-six-opal.vercel.app/api/line-webhook`
- 啟用「Use webhook」
- 啟用「Verify webhook」

## 🧪 測試流程

### 測試步驟：
1. **加入 LINE 官方帳號**
   - 掃描 QR Code 或搜尋 LINE ID
   - 應該會收到歡迎訊息

2. **開始報名流程**
   - 回覆「報名」
   - 系統會引導您填寫格式

3. **填寫報名資訊**
   - 按照以下格式填寫：
   ```
   姓名：張小明
   課程：歌唱課
   ```

4. **確認收到付款資訊**
   - 系統會自動發送付款資訊
   - 包含銀行帳號等詳細資訊

5. **模擬付款回報**
   - 回覆「張小明 12345」（姓名 + 帳號後五碼）
   - 系統會確認付款狀態

## 📋 支援的課程選項

- `歌唱課` 或 `singing`
- `吉他課` 或 `guitar`
- `創作課` 或 `songwriting`
- `春曲創作團班` 或 `band-workshop`

## 🔧 故障排除

### 如果 Webhook 不工作：
1. 檢查 Vercel 部署是否成功
2. 確認 Webhook URL 正確
3. 檢查 LINE Developer Console 的設定
4. 查看 Vercel 的 Function Logs

### 如果訊息沒有回應：
1. 確認 LINE_CHANNEL_ACCESS_TOKEN 正確
2. 確認 LINE_CHANNEL_SECRET 正確
3. 檢查資料庫連接
4. 查看伺服器日誌

## 📞 聯絡資訊

如有問題，請聯繫技術支援。
