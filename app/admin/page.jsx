'use client'

import { useState, useEffect } from 'react'

export default function AdminPage() {
  const [students, setStudents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [enrollmentFilter, setEnrollmentFilter] = useState('ALL')
  const [courseFilter, setCourseFilter] = useState('ALL')
  
  // 批量操作相關狀態
  const [selectedStudents, setSelectedStudents] = useState([])
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchOperation, setBatchOperation] = useState('')
  const [batchMessage, setBatchMessage] = useState('')
  const [batchTemplate, setBatchTemplate] = useState('')
  
  // 通知模板狀態
  const [notificationTemplates, setNotificationTemplates] = useState({})
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  
  // 防止重複發送訊息的狀態
  const [sendingMessages, setSendingMessages] = useState(new Set()) // 追蹤正在發送的訊息
  const [batchSending, setBatchSending] = useState(false) // 批量發送狀態
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 }) // 批量發送進度
  
  // 簡單緩存機制
  const [lastFetch, setLastFetch] = useState(null) // 上次抓取時間
  const [cacheExpiry] = useState(5 * 60 * 1000) // 5分鐘緩存過期時間
  
  // 防抖搜索相關狀態
  const [searchTimeout, setSearchTimeout] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  
  // 載入狀態優化
  const [loadingStates, setLoadingStates] = useState({
    students: false,
    search: false,
    operations: new Set()
  })
  

  // 測試 LINE 連線的函式
  const testLineConnection = async () => {
    try {
      const response = await fetch('/api/admin/test-line')
      const result = await response.json()
      
      if (result.success) {
        alert(`✅ LINE API 連線正常！\n\nToken 長度: ${result.details.tokenLength} 字元`)
      } else {
        alert(`❌ LINE API 連線失敗：\n\n${result.error}\n\n${result.details}`)
      }
    } catch (error) {
      console.error('測試 LINE 連線失敗:', error)
      alert('❌ 測試 LINE 連線時發生錯誤。')
    }
  }

  // 檢查緩存是否有效
  const isCacheValid = () => {
    if (!lastFetch) return false
    return (Date.now() - lastFetch) < cacheExpiry
  }

  // 獲取學生資料的函式（帶緩存）
  const fetchStudents = async (forceRefresh = false) => {
    // 如果有有效緩存且不強制刷新，跳過請求
    if (!forceRefresh && isCacheValid() && students.length > 0) {
      console.log('使用緩存數據，跳過 API 請求')
      return
    }

    setIsLoading(true);
    try {
      console.log('從 API 獲取新數據...')
      const response = await fetch('/api/admin/students')
      const data = await response.json()
      setStudents(data)
      setLastFetch(Date.now()) // 記錄抓取時間
    } catch (error) {
      console.error("無法獲取學生資料:", error)
      alert('無法載入學生資料，請稍後再試。')
    } finally {
      setIsLoading(false)
    }
  }

  // 手動刷新數據（強制重新抓取）
  const refreshStudents = () => {
    fetchStudents(true)
  }

  // 清理緩存（在數據更新後調用）
  const invalidateCache = () => {
    setLastFetch(null)
    // 同時清理 localStorage 緩存
    localStorage.removeItem('admin-students-cache')
    localStorage.removeItem('admin-students-cache-time')
  }

  // 防抖搜索函數
  const handleSearchChange = (value) => {
    setSearchTerm(value)
    
    // 清除之前的定時器
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    
    // 如果搜索框為空，立即顯示所有結果
    if (!value.trim()) {
      setIsSearching(false)
      return
    }
    
    // 設置搜索中狀態
    setIsSearching(true)
    
    // 設置新的定時器，800ms 後執行搜索
    const timeout = setTimeout(() => {
      setIsSearching(false)
      invalidateCache() // 清理緩存，強制重新獲取
      fetchStudents(true) // 強制刷新
    }, 800)
    
    setSearchTimeout(timeout)
  }

  // 骨架屏組件
  const SkeletonCard = () => (
    <div className="animate-pulse">
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 rounded w-24"></div>
            <div className="h-3 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="h-6 bg-gray-300 rounded-full w-16"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-40"></div>
          <div className="h-3 bg-gray-200 rounded w-28"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 bg-gray-300 rounded w-20"></div>
          <div className="h-8 bg-gray-300 rounded w-24"></div>
        </div>
      </div>
    </div>
  )

  const SkeletonTable = () => (
    <div className="animate-pulse space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <div className="flex gap-4">
            <div className="h-4 bg-gray-300 rounded w-20"></div>
            <div className="h-4 bg-gray-300 rounded w-24"></div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
            <div className="h-4 bg-gray-300 rounded w-20"></div>
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-gray-100 last:border-b-0">
            <div className="flex gap-4 items-center">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="flex gap-2 ml-auto">
                <div className="h-6 bg-gray-200 rounded w-16"></div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // 從 localStorage 加載緩存數據
  useEffect(() => {
    try {
      const cachedData = localStorage.getItem('admin-students-cache')
      const cachedTime = localStorage.getItem('admin-students-cache-time')
      
      if (cachedData && cachedTime) {
        const cacheAge = Date.now() - parseInt(cachedTime)
        if (cacheAge < cacheExpiry) {
          const parsedData = JSON.parse(cachedData)
          setStudents(parsedData)
          setLastFetch(parseInt(cachedTime))
          console.log('從 localStorage 加載緩存數據')
        } else {
          // 緩存已過期，清理
          localStorage.removeItem('admin-students-cache')
          localStorage.removeItem('admin-students-cache-time')
        }
      }
    } catch (error) {
      console.error('載入緩存失敗:', error)
      // 清理損壞的緩存
      localStorage.removeItem('admin-students-cache')
      localStorage.removeItem('admin-students-cache-time')
    }
    
    fetchStudents()
    fetchNotificationTemplates()
  }, [])

  // 當學員數據更新時，保存到 localStorage
  useEffect(() => {
    if (students.length > 0 && lastFetch) {
      try {
        localStorage.setItem('admin-students-cache', JSON.stringify(students))
        localStorage.setItem('admin-students-cache-time', lastFetch.toString())
      } catch (error) {
        console.error('保存緩存失敗:', error)
      }
    }
  }, [students, lastFetch])

  // 獲取通知模板
  const fetchNotificationTemplates = async () => {
    try {
      const response = await fetch('/api/admin/notification-templates')
      const result = await response.json()
      if (result.success) {
        setNotificationTemplates(result.templates)
      }
    } catch (error) {
      console.error('獲取通知模板失敗:', error)
    }
  }


  // 更新學生付款狀態的函式
  const handleUpdateStatus = async (studentId, newStatus) => {
    const statusText = newStatus === 'PAID' ? '已付款' : '尚未付款'
    if (!confirm(`您確定要將這位學員標記為「${statusText}」嗎？`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: newStatus }),
      })

      if (!response.ok) {
        throw new Error('更新失敗')
      }

      // 即時更新畫面上該學生的狀態，無需重新整理
      setStudents(students.map(s => 
        s.id === studentId ? { ...s, paymentStatus: newStatus } : s
      ))
      invalidateCache() // 清理緩存
      alert('更新成功！')
    } catch (error) {
      console.error("更新付款狀態失敗:", error)
      alert('更新狀態時發生錯誤。')
    }
  }

  // 發送 LINE 訊息的函式
  const handleSendLineMessage = async (studentId) => {
    const student = students.find(s => s.id === studentId)
    if (!student) return

    if (!student.lineUserId) {
      alert('此學員未連結 LINE，無法發送訊息。')
      return
    }

    const message = prompt(`發送 LINE 訊息給 ${student.name}：`, `您好 ${student.name}，關於您的${getCourseName(student.course)}報名...`)
    
    if (!message) return

    try {
      const response = await fetch('/api/admin/send-line-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentId: studentId, 
          message: message 
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert(`✅ 訊息已成功發送給 ${student.name}！`)
      } else {
        alert(`❌ 發送失敗：${result.error}`)
      }
    } catch (error) {
      console.error("發送 LINE 訊息失敗:", error)
      alert('❌ 發送訊息時發生錯誤，請稍後再試。')
    }
  }

  // 發送補付提醒的函式
  const handleSendSupplementReminder = async (studentId) => {
    // 防止重複發送
    if (sendingMessages.has(studentId)) {
      return
    }

    const student = students.find(s => s.id === studentId)
    if (!student) return

    if (!confirm(`您確定要發送補付提醒給 ${student.name} 嗎？`)) {
      return
    }

    // 添加到發送中列表
    setSendingMessages(prev => new Set([...prev, studentId]))

    try {
      const expectedPrice = getCoursePrice(student.course)
      const expectedNumber = parseInt(expectedPrice.replace(/[^\d]/g, ''))
      const paidNumber = student.paymentAmount ? parseInt(student.paymentAmount.replace(/[^\d]/g, '')) : 0
      const shortAmount = expectedNumber - paidNumber

      const reminderMessage = `您好 ${student.name}，

關於您的 ${getCourseName(student.course)} 報名：

課程：${getCourseName(student.course)}
應付金額：${expectedPrice}
已付金額：${student.paymentAmount || '0'}
尚需補付：${shortAmount} 元

請盡快補付剩餘金額 ${shortAmount} 元，以完成課程報名。

如有任何問題，請隨時聯繫我們。

謝謝！`

      const response = await fetch('/api/admin/send-line-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentId: studentId, 
          message: reminderMessage 
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert(`✅ 補付提醒已成功發送給 ${student.name}！`)
      } else {
        alert(`❌ 發送失敗：${result.error}`)
      }
    } catch (error) {
      console.error("發送補付提醒失敗:", error)
      alert('❌ 發送補付提醒時發生錯誤，請稍後再試。')
    } finally {
      // 從發送中列表移除
      setSendingMessages(prev => {
        const newSet = new Set(prev)
        newSet.delete(studentId)
        return newSet
      })
    }
  }

  // 恢復報名的函式
  const handleRestoreEnrollment = async (studentId) => {
    const student = students.find(s => s.id === studentId)
    if (!student) return

    if (!confirm(`您確定要恢復 ${student.name} 的報名狀態嗎？\n\n這將把報名狀態從「已取消」改為「有效報名」。`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enrollmentStatus: 'ACTIVE',
          cancellationDate: null,
          cancellationReason: null
        }),
      })

      if (!response.ok) {
        throw new Error('恢復失敗')
      }

      // 即時更新畫面上該學生的狀態
      setStudents(students.map(s => 
        s.id === studentId ? { 
          ...s, 
          enrollmentStatus: 'ACTIVE',
          cancellationDate: null,
          cancellationReason: null
        } : s
      ))
      
      invalidateCache() // 清理緩存
      alert(`已成功恢復 ${student.name} 的報名狀態！`)
    } catch (error) {
      console.error("恢復報名狀態失敗:", error)
      alert('恢復報名狀態時發生錯誤。')
    }
  }

  const handleProcessRefund = async (studentId) => {
    const student = students.find(s => s.id === studentId)
    if (!student) return

    if (!confirm(`您確定要處理 ${student.name} 的退款嗎？\n\n這將把退款狀態從「待處理」改為「已退款」。`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/students/${studentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('退款處理失敗')
      }

      // 即時更新畫面上該學生的狀態
      setStudents(students.map(s => 
        s.id === studentId ? { 
          ...s, 
          refundStatus: 'COMPLETED',
          refundDate: new Date().toISOString()
        } : s
      ))
      
      alert(`已成功處理 ${student.name} 的退款！`)
    } catch (error) {
      console.error("退款處理失敗:", error)
      alert('退款處理時發生錯誤。')
    }
  }

  // 計算尚需補付金額的函式
  const calculateShortAmount = (student) => {
    const coursePrice = getCoursePrice(student.course)
    const paidAmount = parseInt(student.paymentAmount) || 0
    const shortAmount = coursePrice - paidAmount
    return shortAmount > 0 ? shortAmount.toLocaleString() : '0'
  }

  // 發送訊息的函式
  const handleSendMessage = async (studentId, message) => {
    // 防止重複發送
    if (sendingMessages.has(studentId)) {
      return
    }

    // 添加到發送中列表
    setSendingMessages(prev => new Set([...prev, studentId]))

    try {
      const response = await fetch('/api/admin/send-line-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, message })
      })

      const result = await response.json()
      
      if (response.ok) {
        alert(`✅ 訊息已成功發送給 ${result.studentName}！`)
      } else {
        alert(`❌ 發送失敗：${result.error}`)
      }
    } catch (error) {
      console.error('發送訊息失敗:', error)
      alert('❌ 發送訊息時發生錯誤，請稍後再試。')
    } finally {
      // 從發送中列表移除
      setSendingMessages(prev => {
        const newSet = new Set(prev)
        newSet.delete(studentId)
        return newSet
      })
    }
  }

  // 處理退款的函式
  const handleRefund = async (studentId, refundStatus) => {
    const student = students.find(s => s.id === studentId)
    if (!student) return

    const statusText = refundStatus === 'PENDING' ? '處理中' : '已完成'
    const refundAmount = student.paymentAmount || getCoursePrice(student.course)
    
    if (!confirm(`您確定要將 ${student.name} 的退款狀態標記為「${statusText}」嗎？\n\n退款金額：${refundAmount}`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/students/${studentId}/refund`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          refundStatus: refundStatus,
          refundAmount: refundAmount,
          refundDate: refundStatus === 'COMPLETED' ? new Date().toISOString() : null
        }),
      })

      if (!response.ok) {
        throw new Error('更新失敗')
      }

      // 即時更新畫面上該學生的狀態
      setStudents(students.map(s => 
        s.id === studentId ? { 
          ...s, 
          refundStatus: refundStatus,
          refundAmount: refundAmount,
          refundDate: refundStatus === 'COMPLETED' ? new Date().toISOString() : s.refundDate
        } : s
      ))
      
      if (refundStatus === 'COMPLETED') {
        alert(`退款完成！已通知 ${student.name} 退款金額：${refundAmount}`)
      } else {
        alert('退款狀態已更新為處理中！')
      }
    } catch (error) {
      console.error("更新退款狀態失敗:", error)
      alert('更新退款狀態時發生錯誤。')
    }
  }

  // 格式化日期時間的函式
  const formatDateTime = (isoString) => {
    return new Date(isoString).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
  }

  // 課程代碼轉換為中文名稱的函式
  const getCourseName = (courseCode) => {
    const courseNames = {
      'singing': '歌唱課',
      'guitar': '吉他課',
      'songwriting': '創作課',
      'band-workshop': '春曲創作團班',
      'spring-composition-group': '春曲創作團班'
    }
    return courseNames[courseCode] || courseCode || '未指定'
  }

  // 獲取課程應付金額的函式
  const getCoursePrice = (courseCode) => {
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
      '春曲創作團班': 'NT$ 6,000'
    }
    return coursePrices[courseCode] || 'NT$ 3,000'
  }

  // 篩選學員的函式
  const filteredStudents = (students || []).filter(student => {
    // 搜索條件（姓名）
    const matchesSearch = searchTerm === '' || 
      student.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // 付款狀態篩選
    const matchesPayment = paymentFilter === 'ALL' || 
      student.paymentStatus === paymentFilter
    
    // 報名狀態篩選
    const matchesEnrollment = enrollmentFilter === 'ALL' || 
      student.enrollmentStatus === enrollmentFilter
    
    // 課程篩選
    const matchesCourse = courseFilter === 'ALL' || 
      student.course === courseFilter || 
      getCourseName(student.course) === courseFilter
    
    return matchesSearch && matchesPayment && matchesEnrollment && matchesCourse
  })

  // 檢查付款金額是否正確的函式
  const isPaymentAmountCorrect = (courseCode, paidAmount) => {
    if (!paidAmount) return null
    
    const expectedPrice = getCoursePrice(courseCode)
    const expectedNumber = parseInt(expectedPrice.replace(/[^\d]/g, ''))
    const paidNumber = parseInt(paidAmount.replace(/[^\d]/g, ''))
    
    return paidNumber === expectedNumber
  }

  // 批量操作函數
  const handleBatchOperation = async () => {
    if (!batchOperation) {
      alert('請選擇操作類型')
      return
    }

    if (selectedStudents.length === 0) {
      alert('請選擇要操作的學員')
      return
    }

    try {
      const response = await fetch('/api/admin/batch-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: batchOperation,
          studentIds: selectedStudents,
          updateData: { reason: batchMessage }
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(`批量操作完成！\n成功：${result.summary.success} 個\n失敗：${result.summary.failed} 個`)
        setShowBatchModal(false)
        setSelectedStudents([])
        fetchStudents() // 重新載入資料
      } else {
        alert(`操作失敗：${result.error}`)
      }
    } catch (error) {
      console.error('批量操作失敗:', error)
      alert('批量操作時發生錯誤')
    }
  }

  // 批量發送訊息函數
  const handleBatchSendMessage = async () => {
    // 防止重複發送
    if (batchSending) {
      return
    }

    if (!batchMessage && !batchTemplate) {
      alert('請輸入訊息內容或選擇模板')
      return
    }

    // 設置批量發送狀態和進度
    setBatchSending(true)
    setBatchProgress({ current: 0, total: selectedStudents.length })

    try {
      const response = await fetch('/api/admin/batch-send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: selectedStudents,
          message: batchMessage,
          templateType: batchTemplate,
          filters: {
            paymentStatus: paymentFilter,
            enrollmentStatus: enrollmentFilter,
            course: courseFilter,
            searchTerm: searchTerm
          }
        })
      })

      const result = await response.json()

      if (result.success) {
        // 顯示詳細結果
        const successRate = ((result.summary.success / result.summary.total) * 100).toFixed(1)
        alert(`✅ 批量發送完成！\n\n📊 發送統計：\n• 總數：${result.summary.total} 個\n• 成功：${result.summary.success} 個\n• 失敗：${result.summary.failed} 個\n• 成功率：${successRate}%`)
        
        setShowNotificationModal(false)
        setSelectedStudents([])
        setBatchMessage('')
        setBatchTemplate('')
      } else {
        alert(`❌ 發送失敗：${result.error}`)
      }
    } catch (error) {
      console.error('批量發送失敗:', error)
      alert('❌ 批量發送時發生錯誤，請稍後再試')
    } finally {
      // 重置批量發送狀態和進度
      setBatchSending(false)
      setBatchProgress({ current: 0, total: 0 })
    }
  }

  // 匯出資料函數
  const handleExportData = async (format) => {
    try {
      const response = await fetch('/api/admin/export-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: format,
          filters: {
            paymentStatus: paymentFilter,
            enrollmentStatus: enrollmentFilter,
            course: courseFilter,
            searchTerm: searchTerm
          }
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `學員資料_${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const result = await response.json()
        alert(`匯出失敗：${result.error}`)
      }
    } catch (error) {
      console.error('匯出資料失敗:', error)
      alert('匯出資料時發生錯誤')
    }
  }

  // 選擇學員函數
  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  // 全選/取消全選函數
  const toggleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id))
    }
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-12">
      {/* 手機版標題 */}
      <div className="block sm:hidden mb-4">
        <h1 className="text-xl font-bold text-slate-900 mb-2">學員管理後台</h1>
        <div className="text-sm text-gray-600">
          顯示 {filteredStudents?.length || 0} / {students?.length || 0} 位學員
        </div>
      </div>

      {/* 桌面版標題 */}
      <div className="hidden sm:flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            學員管理後台
          </h1>
          {lastFetch && (
            <div className="flex items-center text-sm text-gray-500 mt-2">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              數據狀態：{isCacheValid() ? '緩存中' : '已過期'}
              <span className="ml-1">
                ({Math.floor((Date.now() - lastFetch) / 1000 / 60)}分鐘前更新)
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={testLineConnection}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="hidden sm:inline">測試 LINE</span>
            <span className="sm:hidden">LINE</span>
          </button>
          
          <button
            onClick={() => setShowNotificationModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0 15 0v5z" />
            </svg>
            <span className="hidden sm:inline">批量通知</span>
            <span className="sm:hidden">通知</span>
          </button>
          
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="hidden sm:inline">批量操作</span>
            <span className="sm:hidden">操作</span>
          </button>
          
          <div className="relative group">
            <button
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">匯出資料</span>
              <span className="sm:hidden">匯出</span>
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 hidden group-hover:block">
              <div className="py-1">
                <button
                  onClick={() => handleExportData('csv')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  CSV 格式
                </button>
                <button
                  onClick={() => handleExportData('json')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  JSON 格式
                </button>
              </div>
            </div>
          </div>
          
          <button
            onClick={refreshStudents}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span className="hidden sm:inline">載入中...</span>
                <span className="sm:hidden">載入</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">刷新資料</span>
                <span className="sm:hidden">刷新</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 手機版按鈕區域 - 移除，改為底部固定導航 */}
      
      {/* 搜索和篩選區域 */}
      <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
        {/* 手機版：搜索框 */}
        <div className="block sm:hidden">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="搜索學員姓名..."
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* 桌面版：完整篩選 */}
        <div className="hidden sm:grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 搜索框 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              搜索學員姓名
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="輸入學員姓名..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
          </div>
          
          {/* 付款狀態篩選 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              付款狀態
            </label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">全部</option>
              <option value="PAID">已付款</option>
              <option value="PARTIAL">部分付款</option>
              <option value="PENDING">待補付</option>
              <option value="UNPAID">尚未付款</option>
            </select>
          </div>
          
          {/* 報名狀態篩選 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              報名狀態
            </label>
            <select
              value={enrollmentFilter}
              onChange={(e) => setEnrollmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">全部</option>
              <option value="ACTIVE">有效報名</option>
              <option value="CANCELLED">已取消</option>
              <option value="COMPLETED">已完成</option>
            </select>
          </div>
          
          {/* 課程篩選 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              課程類型
            </label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">全部課程</option>
              <option value="歌唱課">歌唱課</option>
              <option value="吉他課">吉他課</option>
              <option value="創作課">創作課</option>
              <option value="春曲創作團班">春曲創作團班</option>
            </select>
          </div>
        </div>

        {/* 手機版：篩選按鈕 */}
        <div className="block sm:hidden">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="ALL">全部付款狀態</option>
              <option value="PAID">已付款</option>
              <option value="UNPAID">尚未付款</option>
              <option value="PARTIAL">部分付款</option>
              <option value="PENDING">待補付</option>
            </select>

            <select
              value={enrollmentFilter}
              onChange={(e) => setEnrollmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="ALL">全部報名狀態</option>
              <option value="ACTIVE">有效報名</option>
              <option value="CANCELLED">已取消</option>
              <option value="COMPLETED">已完成</option>
            </select>
          </div>
          
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="ALL">全部課程</option>
            <option value="歌唱課">歌唱課</option>
            <option value="吉他課">吉他課</option>
            <option value="創作課">創作課</option>
            <option value="春曲創作團班">春曲創作團班</option>
          </select>
        </div>
        
        {/* 清除篩選按鈕 */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              setSearchTerm('')
              setPaymentFilter('ALL')
              setEnrollmentFilter('ALL')
              setCourseFilter('ALL')
            }}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            清除篩選
          </button>
        </div>
        
        {/* 統計信息 */}
        <div className="text-sm text-gray-600">
          {/* 手機版統計 */}
          <div className="block sm:hidden">
            <div className="mb-2">
              顯示 {filteredStudents?.length || 0} / {students?.length || 0} 位學員
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>已付款: {filteredStudents?.filter(s => s.paymentStatus === 'PAID').length || 0}</div>
              <div>未付款: {filteredStudents?.filter(s => s.paymentStatus === 'UNPAID').length || 0}</div>
              <div>部分付款: {filteredStudents?.filter(s => s.paymentStatus === 'PARTIAL').length || 0}</div>
              <div>待補付: {filteredStudents?.filter(s => s.paymentStatus === 'PENDING').length || 0}</div>
            </div>
          </div>

          {/* 桌面版統計 */}
          <div className="hidden sm:flex items-center justify-between">
            <div>
              顯示 {filteredStudents?.length || 0} / {students?.length || 0} 位學員
            </div>
            <div className="flex gap-4">
              <span>已付款: {filteredStudents?.filter(s => s.paymentStatus === 'PAID').length || 0}</span>
              <span>未付款: {filteredStudents?.filter(s => s.paymentStatus === 'UNPAID').length || 0}</span>
              <span>部分付款: {filteredStudents?.filter(s => s.paymentStatus === 'PARTIAL').length || 0}</span>
              <span>待補付: {filteredStudents?.filter(s => s.paymentStatus === 'PENDING').length || 0}</span>
            </div>
          </div>
        </div>
      </div>
      
      {isLoading ? ( 
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在載入學員資料...</p>
        </div>
      ) : (
        <>
          {/* 手機版：卡片式顯示 */}
          <div className="block sm:hidden space-y-4">
            {filteredStudents?.map((student) => (
              <div key={student.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => toggleStudentSelection(student.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">{student.name}</h3>
                      <div className="text-sm text-gray-600">
                        {getCourseName(student.course)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      student.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                      student.paymentStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                      student.paymentStatus === 'PENDING' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {student.paymentStatus === 'PAID' ? '已付款' :
                       student.paymentStatus === 'PARTIAL' ? '部分付款' :
                       student.paymentStatus === 'PENDING' ? '待補付' : '尚未付款'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">報名狀態:</span>
                    <span className={`font-medium ${
                      student.enrollmentStatus === 'ACTIVE' ? 'text-green-600' :
                      student.enrollmentStatus === 'CANCELLED' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {student.enrollmentStatus === 'ACTIVE' ? '有效報名' :
                       student.enrollmentStatus === 'CANCELLED' ? '已取消' : '已完成'}
                    </span>
                  </div>

                  {student.lineUserId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">LINE:</span>
                      <span className="text-green-600 text-xs font-mono">
                        {student.lineUserId?.substring(0, 8)}...
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-gray-600">註冊日期:</span>
                    <span className="text-gray-900">
                      {new Date(student.createdAt).toLocaleDateString('zh-TW')}
                    </span>
                  </div>

                  {student.paymentAmount && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">付款金額:</span>
                      <span className="text-gray-900">NT$ {student.paymentAmount.toLocaleString()}</span>
                    </div>
                  )}

                  {student.paymentStatus === 'PARTIAL' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
                      <div className="text-yellow-800 text-xs">
                        <div>已付: NT$ {student.paymentAmount?.toLocaleString() || '0'}</div>
                        <div>尚需補付: NT$ {calculateShortAmount(student)}</div>
                        <div className="text-yellow-600 mt-1">⚠️ 需要補付</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {student.enrollmentStatus === 'CANCELLED' && (
                    <button
                      onClick={() => handleRestoreEnrollment(student.id)}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                    >
                      恢復報名
                    </button>
                  )}

                  {student.paymentStatus === 'PARTIAL' && (
                    <button
                      onClick={() => handleSendSupplementReminder(student.id)}
                      disabled={sendingMessages.has(student.id)}
                      className={`px-3 py-1 text-white text-xs rounded-md transition-colors ${
                        sendingMessages.has(student.id)
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-yellow-600 hover:bg-yellow-700'
                      }`}
                    >
                      {sendingMessages.has(student.id) ? '發送中...' : '發送補付提醒'}
                    </button>
                  )}

                  {student.enrollmentStatus === 'CANCELLED' && student.refundStatus === 'PENDING' && (
                    <button
                      onClick={() => handleProcessRefund(student.id)}
                      className="px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors"
                    >
                      處理退款
                    </button>
                  )}

                  <button
                    onClick={() => {
                      const message = prompt('請輸入要發送的訊息:')
                      if (message) {
                        handleSendMessage(student.id, message)
                      }
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                  >
                    💬 聯繫
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 桌面版：表格顯示 */}
          <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">
                  <input
                    type="checkbox"
                    checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">姓名</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">課程</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">LINE 資訊</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">註冊日期</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">報名狀態</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">付款狀態</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">退款狀態</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">付款資訊</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredStudents?.map((student) => (
                <tr key={student.id}>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => toggleStudentSelection(student.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{student.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                      {getCourseName(student.course)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="text-xs space-y-1">
                      {student.lineUserId ? (
                        <>
                          <div className="font-medium text-green-700">已連結 LINE</div>
                          <div className="text-slate-500 font-mono text-xs break-all">
                            ID: {student.lineUserId?.substring(0, 8)}...
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(student.lineUserId)
                              alert('LINE ID 已複製到剪貼簿！')
                            }}
                            className="text-blue-600 hover:text-blue-800 underline text-xs"
                          >
                            複製完整 ID
                          </button>
                        </>
                      ) : (
                        <div className="text-slate-400">未連結</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDateTime(student.createdAt)}</td>
                  <td className="px-6 py-4 text-sm">
                    {student.enrollmentStatus === 'ACTIVE' ? (
                      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        有效報名
                      </span>
                    ) : student.enrollmentStatus === 'CANCELLED' ? (
                      <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                        已取消
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-600/10">
                        已完成
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {student.paymentStatus === 'PAID' ? (
                      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        已付款
                      </span>
                    ) : student.paymentStatus === 'PARTIAL' ? (
                      <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/20">
                        部分付款
                      </span>
                    ) : student.paymentStatus === 'PENDING' ? (
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                        待補付
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                        尚未付款
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {student.refundStatus === 'NONE' ? (
                      <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-600/10">
                        無退款
                      </span>
                    ) : student.refundStatus === 'PENDING' ? (
                      <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/20">
                        處理中
                      </span>
                    ) : student.refundStatus === 'COMPLETED' ? (
                      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        已完成
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                        已拒絕
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {student.paymentStatus === 'PAID' ? (
                      <div className="text-xs space-y-1">
                        <div className="font-medium text-green-700">已付款</div>
                        <div className="text-blue-600 font-medium">課程: {getCourseName(student.course)}</div>
                        <div className="text-purple-600 font-medium">應付: {getCoursePrice(student.course)}</div>
                        {student.paymentReference && (
                          <div className="text-slate-600">後五碼: {student.paymentReference}</div>
                        )}
                        {student.paymentAmount && (
                          <div className={`font-medium ${
                            isPaymentAmountCorrect(student.course, student.paymentAmount) 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            實付: {student.paymentAmount}
                            {isPaymentAmountCorrect(student.course, student.paymentAmount) === false && (
                              <span className="ml-1 text-red-500">❌</span>
                            )}
                            {isPaymentAmountCorrect(student.course, student.paymentAmount) === true && (
                              <span className="ml-1 text-green-500">✅</span>
                            )}
                          </div>
                        )}
                        {student.paymentDate && (
                          <div className="text-slate-500">時間: {formatDateTime(student.paymentDate)}</div>
                        )}
                        {student.paymentNotes && (
                          <div className="text-slate-500 truncate max-w-32" title={student.paymentNotes}>
                            備註: {student.paymentNotes}
                          </div>
                        )}
                      </div>
                    ) : student.paymentStatus === 'PARTIAL' ? (
                      <div className="text-xs space-y-1">
                        <div className="font-medium text-yellow-700">部分付款</div>
                        <div className="text-blue-600 font-medium">課程: {getCourseName(student.course)}</div>
                        <div className="text-purple-600 font-medium">應付: {getCoursePrice(student.course)}</div>
                        {student.paymentAmount && (
                          <div className="font-medium text-orange-600">
                            已付: {student.paymentAmount}
                          </div>
                        )}
                        {(() => {
                          const expectedPrice = getCoursePrice(student.course)
                          const expectedNumber = parseInt(expectedPrice.replace(/[^\d]/g, ''))
                          const paidNumber = student.paymentAmount ? parseInt(student.paymentAmount.replace(/[^\d]/g, '')) : 0
                          const shortAmount = expectedNumber - paidNumber
                          return shortAmount > 0 ? (
                            <div className="font-medium text-red-600">
                              尚需: {shortAmount} 元
                            </div>
                          ) : null
                        })()}
                        {student.paymentReference && (
                          <div className="text-slate-600">後五碼: {student.paymentReference}</div>
                        )}
                        {student.paymentDate && (
                          <div className="text-slate-500">時間: {formatDateTime(student.paymentDate)}</div>
                        )}
                        {student.paymentNotes && (
                          <div className="text-slate-500 truncate max-w-32" title={student.paymentNotes}>
                            備註: {student.paymentNotes}
                          </div>
                        )}
                        <div className="mt-1 p-1 bg-yellow-50 rounded border border-yellow-200">
                          <div className="text-yellow-800 font-medium">⚠️ 需要補付</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs">
                        <span className="text-slate-400">-</span>
                        <div className="text-blue-600 font-medium mt-1">課程: {getCourseName(student.course)}</div>
                        <div className="text-purple-600 font-medium">應付: {getCoursePrice(student.course)}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2 flex-wrap">
                      <div className="flex gap-1">
                        {student.enrollmentStatus === 'ACTIVE' ? (
                          student.paymentStatus === 'UNPAID' ? (
                            <button
                              onClick={() => handleUpdateStatus(student.id, 'PAID')}
                              className="rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                            >
                              標記為已付款
                            </button>
                          ) : student.paymentStatus === 'PARTIAL' ? (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(student.id, 'PAID')}
                                className="rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                              >
                                標記為已付款
                              </button>
                              <button
                                onClick={() => handleSendSupplementReminder(student.id)}
                                disabled={sendingMessages.has(student.id)}
                                className={`rounded px-2 py-1 text-xs font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                                  sendingMessages.has(student.id)
                                    ? 'bg-gray-400 cursor-not-allowed focus-visible:outline-gray-400'
                                    : 'bg-yellow-600 hover:bg-yellow-500 focus-visible:outline-yellow-600'
                                }`}
                              >
                                {sendingMessages.has(student.id) ? '發送中...' : '發送補付提醒'}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(student.id, 'UNPAID')}
                              className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                            >
                              標記為未付款
                            </button>
                          )
                        ) : student.enrollmentStatus === 'CANCELLED' ? (
                          <>
                            <button
                              onClick={() => handleRestoreEnrollment(student.id)}
                              className="rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                            >
                              恢復報名
                            </button>
                            {student.refundStatus === 'NONE' ? (
                              <button
                                onClick={() => handleRefund(student.id, 'PENDING')}
                                className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                              >
                                處理退款
                              </button>
                            ) : student.refundStatus === 'PENDING' ? (
                              <button
                                onClick={() => handleRefund(student.id, 'COMPLETED')}
                                className="rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                              >
                                完成退款
                              </button>
                            ) : (
                              <span className="text-xs text-green-600 font-medium">已退款</span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                      
                      {/* 通用聯繫按鈕 */}
                      <button
                        onClick={() => handleSendLineMessage(student.id)}
                        className="rounded bg-purple-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
                        title={`聯繫 ${student.name}`}
                      >
                        💬 聯繫
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      {/* 批量操作模態框 */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">批量操作</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                操作類型
              </label>
              <select
                value={batchOperation}
                onChange={(e) => setBatchOperation(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">請選擇操作</option>
                <option value="markAsPaid">標記為已付款</option>
                <option value="markAsUnpaid">標記為未付款</option>
                <option value="cancelEnrollment">取消報名</option>
                <option value="restoreEnrollment">恢復報名</option>
              </select>
            </div>

            {batchOperation === 'cancelEnrollment' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  取消原因
                </label>
                <input
                  type="text"
                  value={batchMessage}
                  onChange={(e) => setBatchMessage(e.target.value)}
                  placeholder="請輸入取消原因"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                已選擇 {selectedStudents.length} 位學員
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBatchOperation}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                確認執行
              </button>
              <button
                onClick={() => setShowBatchModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量通知模態框 */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">批量發送通知</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                通知模板
              </label>
              <select
                value={batchTemplate}
                onChange={(e) => setBatchTemplate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">請選擇模板</option>
                {Object.entries(notificationTemplates).map(([key, template]) => (
                  <option key={key} value={key}>{template.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                自訂訊息
              </label>
              <textarea
                value={batchMessage}
                onChange={(e) => setBatchMessage(e.target.value)}
                placeholder="輸入自訂訊息內容...

可使用的變數：
{name} - 學員姓名
{course} - 課程名稱
{amount} - 課程價格
{paidAmount} - 已付金額
{shortAmount} - 尚需補付金額
{paymentTime} - 付款時間

例如：親愛的 {name}，您的 {course} 將於 10/20 開始！"
                rows={6}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                已選擇 {selectedStudents.length} 位學員
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBatchSendMessage}
                disabled={batchSending}
                className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                  batchSending
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {batchSending ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    發送中... ({batchProgress.current}/{batchProgress.total})
                  </div>
                ) : (
                  '發送通知'
                )}
              </button>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 手機版固定底部導航欄 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 sm:hidden">
        <div className="grid grid-cols-5 gap-1 p-2">
          <button
            onClick={testLineConnection}
            className="flex flex-col items-center justify-center py-2 px-1 text-xs text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
            title="測試 LINE"
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>LINE</span>
          </button>

          <button
            onClick={() => setShowNotificationModal(true)}
            className="flex flex-col items-center justify-center py-2 px-1 text-xs text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
            title="批量通知"
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0 15 0v5z" />
            </svg>
            <span>通知</span>
          </button>

          <button
            onClick={() => setShowBatchModal(true)}
            className="flex flex-col items-center justify-center py-2 px-1 text-xs text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
            title="批量操作"
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>操作</span>
          </button>

          <button
            onClick={() => handleExportData('csv')}
            className="flex flex-col items-center justify-center py-2 px-1 text-xs text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
            title="匯出資料"
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>匯出</span>
          </button>

          <button
            onClick={refreshStudents}
            disabled={isLoading}
            className="flex flex-col items-center justify-center py-2 px-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="刷新資料"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 mb-1"></div>
                <span>載入</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>刷新</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 為底部導航欄預留空間 */}
      <div className="h-20 sm:hidden"></div>
    </div>
  )
}