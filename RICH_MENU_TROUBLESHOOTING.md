# Rich Menu 顯示問題排查指南

## 🔍 為什麼看不到 Rich Menu？

即使已經設定為預設，LINE 中可能還是看不到 Rich Menu。以下是常見原因和解決方法：

## 📋 檢查清單

### 1. 確認 Rich Menu 狀態

**檢查方法**：
1. 打開 `check-rich-menu.html`
2. 點擊「檢查 Rich Menu 列表」
3. 確認您的 Rich Menu：
   - ✅ 已存在
   - ✅ 已上傳圖片
   - ✅ 已設定為預設

**如果沒有上傳圖片**：
- Rich Menu 必須先上傳圖片才能設定為預設
- 即使 API 返回成功，如果沒有圖片，LINE 也不會顯示

### 2. 確認操作順序

**正確的順序**：
1. ✅ 創建 Rich Menu（或使用現有的）
2. ✅ **先上傳圖片**（最重要！）
3. ✅ 然後設定為預設

**錯誤的順序**：
- ❌ 先設定為預設，再上傳圖片（不會顯示）

### 3. LINE 應用程式相關

#### 3.1 完全重新啟動 LINE

**步驟**：
1. **完全關閉 LINE**（不是只切換應用程式）
   - iOS：雙擊 Home 鍵，向上滑動 LINE 應用程式
   - Android：進入多工視窗，關閉 LINE
   - 或直接重啟手機
2. **等待 30 秒**
3. **重新打開 LINE**
4. 進入您的 LINE Bot 聊天視窗

#### 3.2 清除 LINE 快取（如果上述方法無效）

**iOS**：
- 設定 → LINE → 清除快取

**Android**：
- 設定 → 應用程式 → LINE → 儲存空間 → 清除快取

#### 3.3 更新 LINE 應用程式

- 確認 LINE 已更新到最新版本
- 舊版本可能不支援某些 Rich Menu 功能

### 4. 檢查 Rich Menu 設定

#### 4.1 確認 Rich Menu ID 正確

**檢查方法**：
1. 在檢查工具中，確認您使用的 Rich Menu ID 是否正確
2. 確認這個 Rich Menu 確實存在於列表中

#### 4.2 確認圖片已上傳

**檢查方法**：
1. 使用 LINE Developers Console：
   - 訪問：https://developers.line.biz/console/
   - 進入您的 Channel → Messaging API → Rich Menu
   - 找到您的 Rich Menu ID
   - 檢查是否有圖片預覽

2. 或使用 API 檢查：
   ```javascript
   // 在瀏覽器 Console 中執行
   fetch('https://music-website-six-opal.vercel.app/api/admin/rich-menu')
     .then(res => res.json())
     .then(data => {
       console.log('Rich Menu 列表:', data)
       // 檢查您的 Rich Menu 是否在列表中
     })
   ```

### 5. 時間延遲問題

**LINE 更新需要時間**：
- 設定為預設後，LINE 可能需要 **5-10 分鐘** 才會更新
- 請耐心等待，不要立即檢查

**建議**：
1. 設定為預設後，等待 5-10 分鐘
2. 完全關閉並重新打開 LINE
3. 再次檢查

### 6. 用戶狀態問題

#### 6.1 確認已加入好友

- Rich Menu 只會顯示給已加入好友的用戶
- 確認您已經加入 LINE Bot 為好友

#### 6.2 重新加入好友（如果上述方法都無效）

1. 封鎖 LINE Bot
2. 解除封鎖
3. 重新加入好友
4. 檢查 Rich Menu 是否顯示

### 7. Rich Menu 圖片問題

#### 7.1 確認圖片規格

**必須符合**：
- ✅ 尺寸：2500 x 1686 像素（精確）
- ✅ 格式：PNG 或 JPEG
- ✅ 大小：< 1MB
- ✅ 圖片內容清晰可見

**如果不符合**：
- 使用圖片編輯軟體調整
- 確保尺寸完全正確（不能是 2501x1686 或 2500x1687）

#### 7.2 確認圖片已正確上傳

**檢查方法**：
1. 嘗試重新上傳圖片
2. 確認上傳時沒有錯誤訊息
3. 如果上傳失敗，檢查錯誤訊息

### 8. API 和環境變數問題

#### 8.1 確認環境變數

**檢查**：
- `LINE_CHANNEL_ACCESS_TOKEN` 是否正確設定
- Token 是否未過期
- Token 是否有正確的權限

#### 8.2 檢查 API 回應

**檢查方法**：
1. 打開瀏覽器開發者工具（F12）
2. 查看 Network 標籤
3. 檢查 API 回應是否有錯誤

### 9. 測試方法

#### 方法一：使用不同的設備

- 在另一台手機或電腦上測試
- 確認是否所有設備都看不到，還是只有特定設備

#### 方法二：使用 LINE Developers Console

1. 訪問：https://developers.line.biz/console/
2. 進入您的 Channel → Messaging API → Rich Menu
3. 檢查 Rich Menu 狀態：
   - 是否有圖片
   - 是否設定為預設
   - 是否有錯誤訊息

#### 方法三：使用 LINE API 直接查詢

```javascript
// 在瀏覽器 Console 中執行
fetch('https://music-website-six-opal.vercel.app/api/admin/rich-menu')
  .then(res => res.json())
  .then(data => {
    console.log('Rich Menu 狀態:', data)
    // 檢查您的 Rich Menu 是否在列表中
    // 檢查是否有圖片
  })
```

## 🎯 最常見的原因

根據經驗，最常見的原因是：

1. **圖片未上傳**（60%）
   - 解決：先上傳圖片，再設定為預設

2. **LINE 應用程式未完全重啟**（25%）
   - 解決：完全關閉 LINE，等待 30 秒，重新打開

3. **時間延遲**（10%）
   - 解決：等待 5-10 分鐘後再檢查

4. **Rich Menu ID 錯誤**（5%）
   - 解決：確認使用的 Rich Menu ID 是否正確

## 📞 如果還是無法解決

如果以上方法都試過了還是看不到：

1. **檢查 Vercel 部署日誌**：
   - 確認 API 是否正常運作
   - 確認沒有錯誤訊息

2. **檢查 LINE Developers Console**：
   - 確認 Rich Menu 狀態
   - 確認是否有錯誤訊息

3. **重新創建 Rich Menu**：
   - 刪除現有的 Rich Menu
   - 創建新的 Rich Menu
   - 上傳圖片
   - 設定為預設

4. **聯繫 LINE 支援**：
   - 如果確認所有設定都正確，可能是 LINE 平台的問題
   - 可以聯繫 LINE Developers 支援

## 🔄 完整重置流程

如果所有方法都無效，可以嘗試完整重置：

1. **刪除現有的 Rich Menu**（使用檢查工具或 API）
2. **創建新的 Rich Menu**
3. **準備符合規格的圖片**（2500x1686，PNG/JPEG，< 1MB）
4. **上傳圖片**（確認上傳成功）
5. **等待 1 分鐘**
6. **設定為預設**（確認設定成功）
7. **等待 5-10 分鐘**
8. **完全關閉 LINE 應用程式**
9. **重新打開 LINE**
10. **檢查 Rich Menu 是否顯示**

