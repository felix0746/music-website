# Rich Menu API 完整使用指南（開發者方式）

## 📋 概述

完全透過 Messaging API 來管理 Rich Menu，不需要使用 LINE Official Account Manager 的視覺化介面。

## 🚀 完整流程

### 步驟 1：創建 Rich Menu

```javascript
// 創建 Rich Menu 定義
const response = await fetch('https://music-website-six-opal.vercel.app/api/admin/rich-menu', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'create'
  })
})

const data = await response.json()
console.log('Rich Menu ID:', data.richMenuId)
// 例如: richmenu-a6389c5b70cb89ab3df24a986c5c3302
```

### 步驟 2：上傳圖片

#### 方式 A：直接上傳檔案（推薦）

```javascript
// 使用 FormData 上傳圖片檔案
const formData = new FormData()
formData.append('richMenuId', 'richmenu-a6389c5b70cb89ab3df24a986c5c3302')
formData.append('image', imageFile) // imageFile 是 File 物件

const response = await fetch('https://music-website-six-opal.vercel.app/api/admin/rich-menu/upload', {
  method: 'POST',
  body: formData
})

const data = await response.json()
console.log('上傳結果:', data)
```

#### 方式 B：使用圖片 URL

```javascript
// 如果圖片已經在網路上
const response = await fetch('https://music-website-six-opal.vercel.app/api/admin/rich-menu', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'upload_image',
    richMenuId: 'richmenu-a6389c5b70cb89ab3df24a986c5c3302',
    imageUrl: 'https://your-image-url.com/rich-menu.png'
  })
})
```

### 步驟 3：設定為預設 Rich Menu

```javascript
// 上傳圖片後，設定為預設
const response = await fetch('https://music-website-six-opal.vercel.app/api/admin/rich-menu', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'set_default',
    richMenuId: 'richmenu-a6389c5b70cb89ab3df24a986c5c3302'
  })
})

const data = await response.json()
console.log('設定結果:', data)
```

## 📝 完整範例（HTML 表單）

```html
<!DOCTYPE html>
<html>
<head>
    <title>Rich Menu 上傳工具</title>
</head>
<body>
    <h1>Rich Menu 圖片上傳</h1>
    
    <form id="uploadForm">
        <div>
            <label>Rich Menu ID:</label>
            <input type="text" id="richMenuId" value="richmenu-a6389c5b70cb89ab3df24a986c5c3302" required>
        </div>
        
        <div>
            <label>選擇圖片:</label>
            <input type="file" id="imageFile" accept="image/png,image/jpeg" required>
        </div>
        
        <button type="submit">上傳圖片</button>
    </form>

    <div id="result"></div>

    <script>
        document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault()
            
            const richMenuId = document.getElementById('richMenuId').value
            const imageFile = document.getElementById('imageFile').files[0]
            
            if (!imageFile) {
                alert('請選擇圖片')
                return
            }
            
            const formData = new FormData()
            formData.append('richMenuId', richMenuId)
            formData.append('image', imageFile)
            
            try {
                const response = await fetch('https://music-website-six-opal.vercel.app/api/admin/rich-menu/upload', {
                    method: 'POST',
                    body: formData
                })
                
                const data = await response.json()
                
                if (data.success) {
                    document.getElementById('result').innerHTML = `
                        <h3>✅ 上傳成功！</h3>
                        <p>Rich Menu ID: ${data.richMenuId}</p>
                        <p>檔案名稱: ${data.fileName}</p>
                        <p>檔案大小: ${(data.fileSize / 1024).toFixed(2)} KB</p>
                        <p>下一步：設定為預設 Rich Menu</p>
                    `
                } else {
                    document.getElementById('result').innerHTML = `
                        <h3>❌ 上傳失敗</h3>
                        <p>${data.error}</p>
                    `
                }
            } catch (error) {
                document.getElementById('result').innerHTML = `
                    <h3>❌ 錯誤</h3>
                    <p>${error.message}</p>
                `
            }
        })
    </script>
</body>
</html>
```

## 🔧 API 端點總覽

### 1. 創建 Rich Menu
```
POST /api/admin/rich-menu
Body: { "action": "create" }
```

### 2. 上傳圖片（檔案）
```
POST /api/admin/rich-menu/upload
Content-Type: multipart/form-data
Body: FormData { richMenuId, image }
```

### 3. 上傳圖片（URL）
```
POST /api/admin/rich-menu
Body: { "action": "upload_image", "richMenuId": "...", "imageUrl": "..." }
```

### 4. 設定為預設
```
POST /api/admin/rich-menu
Body: { "action": "set_default", "richMenuId": "..." }
```

### 5. 查詢列表
```
GET /api/admin/rich-menu
```

### 6. 刪除 Rich Menu
```
DELETE /api/admin/rich-menu?richMenuId=...
```

## 📋 使用 curl 命令

### 創建 Rich Menu
```bash
curl -X POST https://music-website-six-opal.vercel.app/api/admin/rich-menu \
  -H "Content-Type: application/json" \
  -d '{"action": "create"}'
```

### 上傳圖片
```bash
curl -X POST https://music-website-six-opal.vercel.app/api/admin/rich-menu/upload \
  -F "richMenuId=richmenu-a6389c5b70cb89ab3df24a986c5c3302" \
  -F "image=@/path/to/your/rich-menu.png"
```

### 設定為預設
```bash
curl -X POST https://music-website-six-opal.vercel.app/api/admin/rich-menu \
  -H "Content-Type: application/json" \
  -d '{"action": "set_default", "richMenuId": "richmenu-a6389c5b70cb89ab3df24a986c5c3302"}'
```

## ✅ 已實作的功能

- ✅ 創建 Rich Menu（透過 API）
- ✅ 上傳圖片（支援檔案和 URL）
- ✅ 設定為預設 Rich Menu
- ✅ 查詢 Rich Menu 列表
- ✅ 刪除 Rich Menu
- ✅ Postback 事件處理（所有 6 個功能）

## 🎯 目前狀態

- **Rich Menu ID**: `richmenu-a6389c5b70cb89ab3df24a986c5c3302`
- **狀態**: 已創建，等待上傳圖片
- **功能**: 所有 Postback 功能已實作完成

## 📝 下一步

1. 準備 Rich Menu 圖片（2500 x 1686 像素，PNG 或 JPEG，< 1MB）
2. 使用上傳 API 上傳圖片
3. 設定為預設 Rich Menu
4. 測試功能

