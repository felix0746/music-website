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

// 計算付款金額（從字串中提取數字）
export function parseAmount(amountString) {
  if (!amountString) return 0
  return parseInt(amountString.replace(/[^\d]/g, '')) || 0
}

// 計算課程應付金額（數字）
export function getCoursePriceNumber(courseCode) {
  const priceString = getCoursePrice(courseCode)
  return parseInt(priceString.replace(/[^\d]/g, '')) || 0
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

// 建立課程介紹輪播卡片 Template Message
export function createCoursesCarousel() {
  return {
    type: 'template',
    altText: '我們的音樂課程',
    template: {
      type: 'carousel',
      columns: [
        {
          thumbnailImageUrl: 'https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=歌唱課',
          title: '歌唱課',
          text: '學習如何愛上自己的歌聲，大方唱出感受',
          actions: [
            {
              type: 'postback',
              label: '了解詳情',
              data: 'action=course_detail&course=singing'
            },
            {
              type: 'postback',
              label: '立即報名',
              data: 'action=enroll&course=singing'
            }
          ]
        },
        {
          thumbnailImageUrl: 'https://via.placeholder.com/300x200/50C878/FFFFFF?text=吉他課',
          title: '吉他課',
          text: '從基礎到進階，養成寫作好習慣',
          actions: [
            {
              type: 'postback',
              label: '了解詳情',
              data: 'action=course_detail&course=guitar'
            },
            {
              type: 'postback',
              label: '立即報名',
              data: 'action=enroll&course=guitar'
            }
          ]
        },
        {
          thumbnailImageUrl: 'https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=創作課',
          title: '創作課',
          text: '探索音樂創作的奧秘',
          actions: [
            {
              type: 'postback',
              label: '了解詳情',
              data: 'action=course_detail&course=songwriting'
            },
            {
              type: 'postback',
              label: '立即報名',
              data: 'action=enroll&course=songwriting'
            }
          ]
        },
        {
          thumbnailImageUrl: 'https://via.placeholder.com/300x200/9B59B6/FFFFFF?text=春曲創作團班',
          title: '春曲創作團班',
          text: '與同好交流，一起把創作帶上舞台',
          actions: [
            {
              type: 'postback',
              label: '了解詳情',
              data: 'action=course_detail&course=band-workshop'
            },
            {
              type: 'postback',
              label: '立即報名',
              data: 'action=enroll&course=band-workshop'
            }
          ]
        }
      ]
    }
  }
}

// 建立付款資訊卡片 Template Message
export function createPaymentInfoTemplate(user) {
  const courseName = getCourseName(user.course)
  const coursePrice = getCoursePrice(user.course)
  
  return {
    type: 'template',
    altText: '您的付款資訊',
    template: {
      type: 'buttons',
      thumbnailImageUrl: 'https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=付款資訊',
      title: '您的付款資訊',
      text: `📚 課程：${courseName}\n💰 金額：${coursePrice}\n\n🏦 銀行：台灣銀行 (004)\n💳 帳號：1234567890123456\n👤 戶名：蘇文紹`,
      actions: [
        {
          type: 'uri',
          label: '複製帳號',
          uri: 'https://line.me/R/msg/text/?1234567890123456'
        },
        {
          type: 'postback',
          label: '我已付款，開始回報',
          data: 'action=payment_report_start'
        }
      ]
    }
  }
}

// 建立付款回報引導卡片 Template Message
export function createPaymentReportTemplate(user) {
  return {
    type: 'template',
    altText: '付款回報',
    template: {
      type: 'buttons',
      title: '付款回報',
      text: '請選擇回報方式：',
      actions: [
        {
          type: 'postback',
          label: '快速回報',
          data: 'action=payment_report_quick'
        },
        {
          type: 'postback',
          label: '詳細回報',
          data: 'action=payment_report_detail'
        }
      ]
    }
  }
}

// 建立取消課程表單卡片 Template Message
export function createCancelCourseTemplate(user) {
  const courseName = getCourseName(user.course)
  
  return {
    type: 'template',
    altText: '取消課程申請',
    template: {
      type: 'buttons',
      title: '取消課程申請',
      text: `課程：${courseName}\n\n請選擇取消原因：`,
      actions: [
        {
          type: 'postback',
          label: '時間無法配合',
          data: 'action=cancel_reason&reason=時間無法配合'
        },
        {
          type: 'postback',
          label: '其他原因',
          data: 'action=cancel_reason&reason=其他原因'
        },
        {
          type: 'postback',
          label: '查看退費政策',
          data: 'action=refund_policy'
        }
      ]
    }
  }
}

// 建立退費狀態查詢卡片 Template Message
export function createRefundStatusTemplate(user) {
  const courseName = getCourseName(user.course)
  const refundStatusText = formatRefundStatus(user.refundStatus)
  const refundAmount = user.refundAmount || '待確認'
  
  let statusDetail = ''
  if (user.refundStatus === 'PENDING') {
    statusDetail = '⏳ 退費處理中，預計 3-5 個工作天內完成'
  } else if (user.refundStatus === 'COMPLETED') {
    statusDetail = `✅ 退費已完成\n💰 退費金額：${refundAmount}`
  } else {
    statusDetail = '無退費記錄'
  }
  
  return {
    type: 'template',
    altText: '退費狀態查詢',
    template: {
      type: 'buttons',
      title: '退費狀態查詢',
      text: `📚 課程：${courseName}\n\n📊 退費狀態：${refundStatusText}\n${statusDetail}`,
      actions: [
        {
          type: 'postback',
          label: '查看退費政策',
          data: 'action=refund_policy'
        },
        {
          type: 'postback',
          label: '聯絡客服',
          data: 'action=contact'
        }
      ]
    }
  }
}

// 建立 Quick Reply 選項
export function createQuickReply(items) {
  return {
    quickReply: {
      items: items.map(item => ({
        type: 'action',
        action: {
          type: 'message',
          label: item.label,
          text: item.text
        }
      }))
    }
  }
}

// 建立課程選擇 Quick Reply
export function createCourseQuickReply() {
  return createQuickReply([
    { label: '歌唱課', text: '課程：歌唱課' },
    { label: '吉他課', text: '課程：吉他課' },
    { label: '創作課', text: '課程：創作課' },
    { label: '春曲創作團班', text: '課程：春曲創作團班' }
  ])
}

// 建立付款後五碼 Quick Reply（常用選項）
export function createPaymentReferenceQuickReply() {
  const items = []
  // 生成一些常用的後五碼選項（實際使用時可以根據用戶歷史記錄生成）
  for (let i = 0; i < 5; i++) {
    const num = String(Math.floor(Math.random() * 90000) + 10000)
    items.push({
      label: `後五碼：${num}`,
      text: `後五碼：${num}`
    })
  }
  return createQuickReply(items)
}

// 建立取消原因 Quick Reply
export function createCancelReasonQuickReply() {
  return createQuickReply([
    { label: '時間無法配合', text: '取消原因：時間無法配合' },
    { label: '個人因素', text: '取消原因：個人因素' },
    { label: '其他原因', text: '取消原因：其他原因' }
  ])
}

// 建立退費需求 Quick Reply
export function createRefundRequestQuickReply() {
  return createQuickReply([
    { label: '需要退費', text: '退費需求：是' },
    { label: '不需要退費', text: '退費需求：否' }
  ])
}

// 建立銀行選擇 Quick Reply（最常見的 12 個銀行 + 其他）
export function createBankSelectionQuickReply() {
  return createQuickReply([
    { label: '🏦 台灣銀行', text: '銀行：台灣銀行' },
    { label: '🏦 土地銀行', text: '銀行：土地銀行' },
    { label: '🏦 合作金庫', text: '銀行：合作金庫' },
    { label: '🏦 第一銀行', text: '銀行：第一銀行' },
    { label: '🏦 華南銀行', text: '銀行：華南銀行' },
    { label: '🏦 彰化銀行', text: '銀行：彰化銀行' },
    { label: '🏦 富邦銀行', text: '銀行：富邦銀行' },
    { label: '🏦 國泰世華', text: '銀行：國泰世華' },
    { label: '🏦 中國信託', text: '銀行：中國信託' },
    { label: '🏦 台新銀行', text: '銀行：台新銀行' },
    { label: '🏦 玉山銀行', text: '銀行：玉山銀行' },
    { label: '🏦 郵局', text: '銀行：郵局' },
    { label: '其他銀行', text: '銀行：其他' }
  ])
}

// 建立課程詳情 Template Message（包含立即報名按鈕）
export function createCourseDetailTemplate(courseCode) {
  const courseName = getCourseName(courseCode)
  const coursePrice = getCoursePrice(courseCode)
  
  const courseDetails = {
    'singing': {
      description: '學習如何愛上自己的歌聲，大方唱出感受',
      features: ['基礎發聲技巧', '音準與節奏訓練', '情感表達', '舞台表現']
    },
    'guitar': {
      description: '從基礎到進階，養成寫作好習慣',
      features: ['基礎和弦', '指法練習', '歌曲彈奏', '創作技巧']
    },
    'songwriting': {
      description: '探索音樂創作的奧秘',
      features: ['詞曲創作', '編曲技巧', '音樂理論', '作品錄製']
    },
    'band-workshop': {
      description: '與同好交流，一起把創作帶上舞台',
      features: ['團體創作', '舞台演出', '同好交流', '作品發表']
    },
    'spring-composition-group': {
      description: '與同好交流，一起把創作帶上舞台',
      features: ['團體創作', '舞台演出', '同好交流', '作品發表']
    }
  }
  
  const course = courseDetails[courseCode] || courseDetails['singing']
  
  return {
    type: 'template',
    altText: `${courseName} - 課程詳情`,
    template: {
      type: 'buttons',
      thumbnailImageUrl: 'https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=' + encodeURIComponent(courseName),
      title: courseName,
      text: `💰 價格：${coursePrice}\n\n📝 課程簡介：\n${course.description}\n\n✨ 課程特色：\n${course.features.map(f => `• ${f}`).join('\n')}\n\n如需報名，請點擊下方「立即報名」按鈕！`,
      actions: [
        {
          type: 'postback',
          label: '立即報名',
          data: `action=enroll&course=${courseCode}`
        },
        {
          type: 'postback',
          label: '查看其他課程',
          data: 'action=courses'
        }
      ]
    }
  }
}

