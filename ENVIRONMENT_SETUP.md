# 環境變數設定說明

## 必要的環境變數

請在專案根目錄建立 `.env.local` 檔案，並加入以下環境變數：

### Resend Email API
```
RESEND_API_KEY=your_resend_api_key_here
```

### LINE Bot Configuration
```
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here
LINE_CHANNEL_SECRET=your_line_channel_secret_here
```

### NextAuth Configuration
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
```

### LINE OAuth Configuration
```
LINE_CLIENT_ID=your_line_client_id_here
LINE_CLIENT_SECRET=your_line_client_secret_here
```

## 如何取得這些值

### 1. Resend API Key
- 前往 [Resend](https://resend.com) 註冊帳號
- 在 Dashboard 中建立 API Key

### 2. LINE Bot 設定
- 前往 [LINE Developers Console](https://developers.line.biz/)
- 建立新的 Provider 和 Channel
- 選擇 "Messaging API" 類型
- 在 Channel 設定中取得 Channel Access Token 和 Channel Secret

### 3. LINE OAuth 設定
- 在 LINE Developers Console 中建立另一個 Channel
- 選擇 "LINE Login" 類型
- 在 Channel 設定中取得 Client ID 和 Client Secret
- 設定 Callback URL: `http://localhost:3000/api/auth/callback/line`

### 4. NextAuth Secret
- 可以使用任何隨機字串
- 建議使用: `openssl rand -base64 32`

## 注意事項
- 請勿將 `.env.local` 檔案提交到 Git
- 生產環境請使用適當的環境變數管理方式
- 確保所有環境變數都已正確設定，否則功能可能無法正常運作
