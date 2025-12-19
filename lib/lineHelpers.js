// LINE Bot 輔助函數

// 課程代碼轉換為中文名稱
export function getCourseName(courseCode) {
  const courseNames = {
    'singing': '歌唱課',
    'guitar': '吉他課',
    'songwriting': '創作課',
    'band-workshop': '春曲創作團班',
    'spring-composition-group': '春曲創作團班',
    '歌唱班': '春曲創作團班' // 舊資料對應
  }
  return courseNames[courseCode] || courseCode || '未指定'
}

// 獲取課程價格
export function getCoursePrice(courseCode) {
  const coursePrices = {
    // 英文代碼
    'singing': 'NT$ 3,000',
    'guitar': 'NT$ 4,000',
    'songwriting': 'NT$ 5,000',
    'band-workshop': 'NT$ 6,000',
    'spring-composition-group': 'NT$ 6,000',
    // 中文名稱
    '歌唱課': 'NT$ 3,000',
    '吉他課': 'NT$ 4,000',
    '創作課': 'NT$ 5,000',
    '春曲創作團班': 'NT$ 6,000',
    '歌唱班': 'NT$ 6,000' // 舊資料對應
  }
  return coursePrices[courseCode] || 'NT$ 3,000'
}

// 計算尚需補付金額
export function calculateShortAmount(student) {
  const expectedPrice = getCoursePrice(student.course)
  const expectedNumber = parseInt(expectedPrice.replace(/[^\d]/g, ''))
  const paidNumber = student.paymentAmount ? parseInt(student.paymentAmount.replace(/[^\d]/g, '')) : 0
  return Math.max(0, expectedNumber - paidNumber)
}

// 格式化付款狀態文字
export function formatPaymentStatus(paymentStatus) {
  const statusMap = {
    'PAID': '✅ 已付款',
    'PARTIAL': '⚠️ 部分付款',
    'PENDING': '⏳ 待付款',
    'UNPAID': '❌ 尚未付款'
  }
  return statusMap[paymentStatus] || '❓ 狀態不明'
}

// 格式化報名狀態文字
export function formatEnrollmentStatus(enrollmentStatus) {
  const statusMap = {
    'ACTIVE': '✅ 已報名',
    'CANCELLED': '❌ 已取消',
    'COMPLETED': '✅ 已完成'
  }
  return statusMap[enrollmentStatus] || '❓ 狀態不明'
}

// 格式化退費狀態文字
export function formatRefundStatus(refundStatus) {
  const statusMap = {
    'NONE': '無',
    'PENDING': '⏳ 退費處理中',
    'COMPLETED': '✅ 已退款',
    'CANCELLED': '❌ 退費已取消'
  }
  return statusMap[refundStatus] || '❓ 狀態不明'
}

