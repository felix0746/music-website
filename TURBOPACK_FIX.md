# Turbopack 錯誤解決方案

## 問題描述

Next.js 16.0.10 預設使用 Turbopack，但遇到以下問題：
- Turbopack panic 錯誤
- 路徑中包含中文字符「文紹」可能導致問題

## 解決方案

### 方法一：使用 webpack 模式（推薦）

1. **停止開發伺服器**（Ctrl+C）

2. **清除快取**：
   
   **PowerShell（Windows）**：
   ```powershell
   Remove-Item -Recurse -Force .next
   ```
   
   **或使用簡短命令**：
   ```powershell
   if (Test-Path .next) { Remove-Item -Recurse -Force .next }
   ```
   
   **Git Bash / Linux / Mac**：
   ```bash
   rm -rf .next
   ```

3. **使用 webpack 模式啟動**：
   ```bash
   npm run dev:webpack
   ```

### 方法二：如果方法一無效，嘗試降級 Next.js

如果環境變數不起作用，可以考慮暫時降級到 Next.js 15：

```bash
npm install next@15.1.6 react@19 react-dom@19 --save
```

### 方法三：移動專案到英文路徑（如果可能）

Turbopack 對中文字符路徑的支援可能不完善。如果可能，將專案移動到沒有中文字符的路徑，例如：
- `C:\LU\HEAX\music-course-website`
- `C:\projects\music-course-website`

## 臨時解決方案

如果以上方法都無效，可以：

1. **使用生產模式測試**：
   ```bash
   npm run build
   npm run start
   ```

2. **或者暫時跳過開發模式**，直接部署到 Vercel 測試

## 注意事項

- 清除 `.next` 資料夾後需要重新編譯
- 環境變數可能需要重啟終端機才能生效
- 如果問題持續，可能是 Next.js 16 的 Turbopack bug，建議回報給 Next.js 團隊

