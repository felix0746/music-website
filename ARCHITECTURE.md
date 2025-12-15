# 音樂課程網站 - 系統架構文件

## 📋 專案概述

這是一個基於 Next.js 15 的音樂課程報名與管理系統，整合了 LINE Bot 功能，提供學員報名、付款管理、後台管理等完整功能。

---

## 🛠 技術棧

### 前端框架
- **Next.js 15.5.3** - React 全端框架（App Router）
- **React 19.1.1** - UI 框架
- **Tailwind CSS 4** - 樣式框架
- **Framer Motion** - 動畫效果

### 後端與資料庫
- **Next.js API Routes** - 後端 API 端點
- **Prisma 6.16.2** - ORM（Object-Relational Mapping）
- **PostgreSQL** - 關聯式資料庫（透過 Prisma）

### 認證與安全
- **NextAuth.js 5.0** - 認證系統（支援 LINE 登入）
- **bcryptjs** - 密碼雜湊（後台管理員登入）
- **Middleware** - 路由保護

### 第三方整合
- **LINE Bot SDK** - LINE 訊息推送與 Webhook 處理
- **Resend** - 電子郵件服務
- **React Email** - 郵件模板

---

## 📁 專案結構

```
music-course-website/
├── app/                          # Next.js App Router
│   ├── admin/                    # 後台管理系統
│   │   ├── login/                # 管理員登入頁面
│   │   │   └── page.jsx
│   │   └── page.jsx              # 主後台頁面（學員管理）
│   ├── api/                      # API 路由
│   │   ├── admin/                # 後台管理 API
│   │   │   ├── login/            # 管理員登入驗證
│   │   │   ├── students/         # 學員資料 CRUD
│   │   │   │   └── [id]/         # 單一學員操作
│   │   │   │       └── refund/   # 退費處理
│   │   │   ├── archive-refunded/ # 自動歸檔功能
│   │   │   ├── archived-students/ # 歸檔學員查詢
│   │   │   ├── batch-send-message/ # 批次發送 LINE 訊息
│   │   │   └── export-data/      # 資料匯出
│   │   ├── auth/                 # 認證相關
│   │   │   └── [...nextauth]/    # NextAuth 處理器
│   │   ├── enroll/               # 網站報名 API
│   │   ├── line-enroll/          # LINE 報名 API
│   │   └── line-webhook/         # LINE Webhook 接收
│   ├── layout.tsx                # 根佈局（包含 SessionProvider）
│   ├── page.tsx                  # 首頁
│   └── globals.css               # 全域樣式
│
├── components/                    # React 組件
│   ├── Navbar.jsx                # 導航列
│   ├── HeroSection.jsx           # 首頁主視覺
│   ├── CourseOverview.jsx        # 課程總覽
│   ├── InstructorSection.jsx    # 講師介紹
│   ├── TestimonialsSection.jsx   # 學員見證
│   ├── FaqSection.jsx            # 常見問題
│   ├── EnrollmentSection.jsx    # 報名區塊
│   ├── LineFloatingButton.jsx    # LINE 浮動按鈕
│   ├── FadeIn.jsx                # 淡入動畫組件
│   └── SessionProvider.jsx       # NextAuth Session 提供者
│
├── lib/                          # 工具函式庫
│   ├── courseData.js             # 課程資料定義
│   └── prisma.js                 # Prisma Client 實例
│
├── prisma/                       # 資料庫相關
│   ├── schema.prisma             # Prisma Schema（資料模型定義）
│   └── dev.db                    # SQLite 開發資料庫（已改用 PostgreSQL）
│
├── middleware.js                 # Next.js 中間件（路由保護）
├── next.config.ts                # Next.js 設定
├── package.json                  # 專案依賴與腳本
└── tsconfig.json                 # TypeScript 設定

```

---

## 🗄 資料庫架構

### User 模型（學員資料）

```prisma
model User {
  // 基本資訊
  id              Int      @id @default(autoincrement())
  lineUserId      String?  @unique
  name            String?
  email           String?
  course          String?
  createdAt       DateTime @default(now())
  
  // LINE 整合
  welcomeMessageSent Boolean @default(false)
  
  // 付款資訊
  paymentStatus   PaymentStatus @default(UNPAID)
  paymentAmount   String?
  paymentMethod   String?
  paymentReference String?
  paymentDate     DateTime?
  paymentNotes    String?
  
  // 報名驗證
  enrollmentCode  String?  @unique
  isVerified      Boolean  @default(false)
  enrollmentDate  DateTime?
  
  // 課程狀態
  enrollmentStatus EnrollmentStatus @default(ACTIVE)
  cancellationDate DateTime?
  cancellationReason String?
  
  // 退費資訊
  refundStatus    RefundStatus @default(NONE)
  refundAmount    String?
  refundDate      DateTime?
  
  // 資料歸檔
  archivedAt      DateTime?
  archiveReason   String?
}
```

### 列舉類型（Enums）

- **PaymentStatus**: `UNPAID` | `PAID` | `PARTIAL` | `PENDING`
- **EnrollmentStatus**: `ACTIVE` | `CANCELLED` | `COMPLETED`
- **RefundStatus**: `NONE` | `PENDING` | `COMPLETED` | `REJECTED`

### 資料庫索引

為提升查詢效能，已建立以下索引：
- `paymentStatus`
- `enrollmentStatus`
- `course`
- `createdAt`
- `name`
- `archivedAt`
- 複合索引：`[paymentStatus, enrollmentStatus]`、`[course, paymentStatus]`、`[refundStatus, archivedAt]`

---

## 🔄 核心功能流程

### 1. 學員報名流程

#### 網站報名
```
用戶填寫表單 → POST /api/enroll
  → 建立 User 記錄（isVerified: false）
  → 發送 LINE 訊息（含報名碼）
  → 用戶透過 LINE 回覆報名碼
  → LINE Webhook 接收訊息
  → 驗證報名碼並更新 isVerified: true
```

#### LINE 報名
```
用戶點擊 LINE 按鈕 → POST /api/line-enroll
  → 建立 User 記錄
  → 發送付款資訊與報名碼
  → 後續流程同上
```

### 2. 付款處理流程

```
用戶透過 LINE 回報付款資訊
  → LINE Webhook 接收訊息
  → 解析付款資訊（金額、後五碼、時間）
  → 更新 User 記錄（paymentStatus, paymentAmount, etc.）
  → 發送確認訊息給用戶
```

### 3. 後台管理流程

```
管理員登入 → POST /api/admin/login
  → 驗證帳密（bcryptjs）
  → 設定 Cookie（admin-auth）
  → Middleware 檢查 Cookie
  → 進入後台頁面
```

#### 後台功能
- **學員列表**：查詢、篩選、搜尋（防抖處理）
- **付款管理**：標記已付/未付、部分付款處理
- **退費處理**：處理退費申請、更新退費狀態
- **LINE 訊息**：單一/批次發送訊息給學員
- **資料歸檔**：自動歸檔（退款完成 30 天後）或手動歸檔
- **統計儀表板**：總學員數、總收入、課程統計、月度趨勢
- **資料匯出**：匯出學員資料為 CSV

### 4. 資料歸檔機制

```
退費完成 → 30 天後自動歸檔
  → POST /api/admin/archive-refunded
  → 更新 archivedAt 和 archiveReason
  → 主列表預設不顯示歸檔學員
  → 可切換查看歸檔學員
```

---

## 🔐 安全機制

### 認證系統

1. **後台管理員登入**
   - 使用 `bcryptjs` 雜湊密碼
   - Cookie-based 認證（`admin-auth`）
   - Middleware 保護 `/admin/*` 路由

2. **LINE 用戶認證**
   - NextAuth.js 整合 LINE Provider
   - OAuth 2.0 流程
   - Session 管理

### 路由保護

```javascript
// middleware.js
- 檢查 /admin 路徑（排除 /admin/login）
- 驗證 admin-auth Cookie
- 未認證則重定向到登入頁
```

---

## 📡 API 端點總覽

### 公開 API

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/enroll` | POST | 網站報名 |
| `/api/line-enroll` | POST | LINE 報名 |
| `/api/line-webhook` | POST | LINE Webhook 接收 |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth 處理器 |

### 後台管理 API（需認證）

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/admin/login` | POST | 管理員登入 |
| `/api/admin/students` | GET | 取得學員列表 |
| `/api/admin/students` | POST | 建立學員 |
| `/api/admin/students/[id]` | GET | 取得單一學員 |
| `/api/admin/students/[id]` | PUT | 更新學員資料 |
| `/api/admin/students/[id]` | DELETE | 刪除學員 |
| `/api/admin/students/[id]/refund` | POST | 處理退費 |
| `/api/admin/archived-students` | GET | 取得歸檔學員 |
| `/api/admin/archive-refunded` | POST | 自動歸檔 |
| `/api/admin/archive-refunded` | PUT | 手動歸檔 |
| `/api/admin/archive-refunded` | DELETE | 恢復學員 |
| `/api/admin/send-line-message` | POST | 發送 LINE 訊息 |
| `/api/admin/batch-send-message` | POST | 批次發送訊息 |
| `/api/admin/export-data` | GET | 匯出資料 |

---

## 🎨 前端架構

### 首頁組件結構

```
page.tsx
├── Navbar (導航列)
├── HeroSection (主視覺)
├── CourseOverview (課程總覽)
├── InstructorSection (講師介紹)
├── TestimonialsSection (學員見證)
├── FaqSection (常見問題)
├── EnrollmentSection (報名區塊)
└── LineFloatingButton (LINE 浮動按鈕)
```

### 後台管理頁面（`app/admin/page.jsx`）

#### 主要功能模組

1. **狀態管理**
   - `students` - 學員列表
   - `searchTerm` - 搜尋關鍵字
   - `filterStatus` - 付款狀態篩選
   - `filterCourse` - 課程篩選
   - `showDashboard` - 儀表板顯示狀態
   - `showArchived` - 歸檔學員顯示狀態
   - `expandedCards` - 手機版卡片展開狀態

2. **效能優化**
   - **防抖搜尋**：`handleSearchChange` 使用 `setTimeout` 延遲 API 呼叫
   - **虛擬化列表**：`VirtualizedStudentList` 只渲染可見項目
   - **載入狀態**：Skeleton 載入動畫

3. **進階篩選**
   - 日期範圍篩選
   - 金額範圍篩選
   - LINE ID 搜尋
   - 退費狀態篩選
   - Email 搜尋

4. **統計儀表板**
   - 總學員數、總收入
   - 課程統計（總數、已付、活躍）
   - 付款狀態統計
   - 月度趨勢圖表

5. **響應式設計**
   - 手機版：卡片式列表，可展開查看詳情
   - 桌面版：表格式列表，內聯展開詳情

---

## 🔌 LINE Bot 整合

### Webhook 處理邏輯

```javascript
// app/api/line-webhook/route.js

接收 LINE 訊息
  → 驗證簽章
  → 解析事件類型
    ├── 文字訊息
    │   ├── 報名碼驗證
    │   ├── 付款資訊回報
    │   └── 其他指令處理
    └── Postback 事件（按鈕點擊）
```

### 訊息發送

- **單一發送**：`/api/admin/send-line-message`
- **批次發送**：`/api/admin/batch-send-message`
- **自動發送**：報名確認、付款確認、退費通知

---

## ⚡ 效能優化

### 已實作優化

1. **資料庫索引**：針對常用查詢欄位建立索引
2. **防抖搜尋**：減少 API 呼叫頻率
3. **虛擬化列表**：大量資料時只渲染可見項目
4. **載入狀態**：Skeleton 載入動畫提升 UX
5. **響應式設計**：手機優先，桌面適配

### 未來可優化項目

- Server-Sent Events (SSE) 即時通知
- Redis 快取層
- 圖片優化與 CDN
- API 回應快取

---

## 🚀 部署架構

### 環境變數

```env
# 資料庫
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...

# LINE Bot
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
LINE_CLIENT_ID=...
LINE_CLIENT_SECRET=...

# 後台管理
ADMIN_USERNAME=...
ADMIN_PASSWORD=... (bcrypt 雜湊)
```

### 建置流程

```bash
npm install
prisma generate      # 產生 Prisma Client
prisma migrate dev   # 執行資料庫遷移
npm run build        # 建置生產版本
npm start            # 啟動生產伺服器
```

---

## 📝 開發規範

### 程式碼風格
- 使用 ESLint 進行程式碼檢查
- 遵循 Next.js 最佳實踐
- 組件使用函數式寫法

### 資料庫遷移
- 使用 Prisma Migrate 管理資料庫變更
- Schema 變更後執行 `prisma migrate dev`

### Git 工作流程
- 主分支：`master`
- 功能開發：建立功能分支
- 提交訊息：使用中文描述變更內容

---

## 🔍 除錯與監控

### 除錯 API（開發環境）

- `/api/debug/check-students` - 檢查學員資料
- `/api/test-prisma` - 測試 Prisma 連線
- `/api/test-env` - 檢查環境變數

### 日誌記錄

- 使用 `console.log` 記錄重要操作
- LINE Webhook 處理記錄
- 錯誤使用 `console.error` 記錄

---

## 📚 相關文件

- `ENVIRONMENT_SETUP.md` - 環境設定指南
- `LINE_SETUP_GUIDE.md` - LINE Bot 設定指南
- `README.md` - 專案說明

---

## 🎯 未來規劃

### Phase 1（已完成）
- ✅ 資料庫索引
- ✅ 防抖搜尋
- ✅ 載入狀態優化

### Phase 2（進行中）
- ✅ 虛擬化列表
- ✅ 進階篩選
- ✅ 統計儀表板

### Phase 3（規劃中）
- ⏳ 即時通知系統（SSE）
- ⏳ 數據分析功能
- ⏳ 移動端優化

---

**最後更新**：2024年（根據專案狀態）

