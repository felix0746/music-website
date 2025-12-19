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

  // 虛擬化列表相關狀態
  const [virtualList, setVirtualList] = useState({
    startIndex: 0,
    endIndex: 50,
    itemHeight: 80, // 每行高度
    containerHeight: 600, // 容器高度
    overscan: 5 // 額外渲染的項目數
  })

  // 高級篩選相關狀態
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState({
    dateRange: {
      start: '',
      end: ''
    },
    paymentAmount: {
      min: '',
      max: ''
    },
    enrollmentDate: {
      start: '',
      end: ''
    },
    hasLineId: 'ALL', // ALL, YES, NO
    refundStatus: 'ALL',
    hasEmail: 'ALL'
  })

  // 統計儀表板相關狀態
  const [showDashboard, setShowDashboard] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [archivedStudents, setArchivedStudents] = useState([])
  const [dashboardData, setDashboardData] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    courseStats: {},
    paymentStats: {},
    monthlyTrends: []
  })

  // 手機版卡片展開狀態
  const [expandedCards, setExpandedCards] = useState(new Set())

  // 切換卡片展開狀態
  const toggleCardExpansion = (studentId) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(studentId)) {
        newSet.delete(studentId)
      } else {
        newSet.add(studentId)
      }
      return newSet
    })
  }

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

  // 虛擬化列表計算
  const calculateVirtualList = (scrollTop, filteredStudents) => {
    const { itemHeight, containerHeight, overscan } = virtualList
    const totalItems = filteredStudents.length
    
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const endIndex = Math.min(totalItems - 1, startIndex + visibleCount + overscan * 2)
    
    return {
      startIndex,
      endIndex,
      totalHeight: totalItems * itemHeight,
      offsetY: startIndex * itemHeight
    }
  }

  // 虛擬化滾動處理
  const handleVirtualScroll = (e) => {
    const scrollTop = e.target.scrollTop
    const filteredStudents = students.filter(student => {
      const searchMatch = !searchTerm || 
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.lineUserId?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const paymentMatch = paymentFilter === 'ALL' || student.paymentStatus === paymentFilter
      const enrollmentMatch = enrollmentFilter === 'ALL' || student.enrollmentStatus === enrollmentFilter
      const courseMatch = courseFilter === 'ALL' || student.course === courseFilter
      
      return searchMatch && paymentMatch && enrollmentMatch && courseMatch
    })
    
    const virtualData = calculateVirtualList(scrollTop, filteredStudents)
    setVirtualList(prev => ({
      ...prev,
      startIndex: virtualData.startIndex,
      endIndex: virtualData.endIndex
    }))
  }

  // 虛擬化列表組件
  const VirtualizedStudentList = ({ students, isDesktop = false }) => {
    const filteredStudents = students.filter(student => {
      const searchMatch = !searchTerm || 
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.lineUserId?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const paymentMatch = paymentFilter === 'ALL' || student.paymentStatus === paymentFilter
      const enrollmentMatch = enrollmentFilter === 'ALL' || student.enrollmentStatus === enrollmentFilter
      const courseMatch = courseFilter === 'ALL' || student.course === courseFilter
      
      return searchMatch && paymentMatch && enrollmentMatch && courseMatch
    })

    const virtualData = calculateVirtualList(0, filteredStudents)
    const visibleStudents = filteredStudents.slice(virtualList.startIndex, virtualList.endIndex + 1)

    if (isDesktop) {
      return (
        <div 
          className="virtual-container overflow-auto border border-gray-200 rounded-lg"
          style={{ height: virtualList.containerHeight }}
          onScroll={handleVirtualScroll}
        >
          <div style={{ height: virtualData.totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${virtualData.offsetY}px)` }}>
              <table className="min-w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      <input
                        type="checkbox"
                        checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents(filteredStudents.map(s => s.id))
                          } else {
                            setSelectedStudents([])
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">學員資訊</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">課程</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">付款狀態</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">報名狀態</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visibleStudents.map((student, index) => (
                    <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {/* 表格內容 - 這裡會插入原有的表格行內容 */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    } else {
      // 手機版虛擬化卡片
      return (
        <div 
          className="virtual-container overflow-auto"
          style={{ height: virtualList.containerHeight }}
          onScroll={handleVirtualScroll}
        >
          <div style={{ height: virtualData.totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${virtualData.offsetY}px)` }}>
              <div className="space-y-4">
                {visibleStudents.map((student) => (
                  <div key={student.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    {/* 卡片內容 - 這裡會插入原有的卡片內容 */}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )
    }
  }

  // 高級篩選邏輯
  const applyAdvancedFilters = (student) => {
    // 日期範圍篩選
    if (advancedFilters.dateRange.start) {
      const startDate = new Date(advancedFilters.dateRange.start)
      const studentDate = new Date(student.createdAt)
      if (studentDate < startDate) return false
    }
    
    if (advancedFilters.dateRange.end) {
      const endDate = new Date(advancedFilters.dateRange.end)
      const studentDate = new Date(student.createdAt)
      if (studentDate > endDate) return false
    }

    // 付款金額篩選
    if (advancedFilters.paymentAmount.min || advancedFilters.paymentAmount.max) {
      const amount = parseInt(student.paymentAmount?.replace(/[^\d]/g, '') || '0')
      if (advancedFilters.paymentAmount.min && amount < parseInt(advancedFilters.paymentAmount.min)) return false
      if (advancedFilters.paymentAmount.max && amount > parseInt(advancedFilters.paymentAmount.max)) return false
    }

    // LINE ID 篩選
    if (advancedFilters.hasLineId !== 'ALL') {
      const hasLineId = Boolean(student.lineUserId)
      if (advancedFilters.hasLineId === 'YES' && !hasLineId) return false
      if (advancedFilters.hasLineId === 'NO' && hasLineId) return false
    }

    // 退費狀態篩選
    if (advancedFilters.refundStatus !== 'ALL' && student.refundStatus !== advancedFilters.refundStatus) {
      return false
    }

    // Email 篩選
    if (advancedFilters.hasEmail !== 'ALL') {
      const hasEmail = Boolean(student.email)
      if (advancedFilters.hasEmail === 'YES' && !hasEmail) return false
      if (advancedFilters.hasEmail === 'NO' && hasEmail) return false
    }

    return true
  }

  // 重置高級篩選
  const resetAdvancedFilters = () => {
    setAdvancedFilters({
      dateRange: { start: '', end: '' },
      paymentAmount: { min: '', max: '' },
      enrollmentDate: { start: '', end: '' },
      hasLineId: 'ALL',
      refundStatus: 'ALL',
      hasEmail: 'ALL'
    })
  }

  // 高級篩選組件
  const AdvancedFiltersPanel = () => (
    <div className={`transition-all duration-300 overflow-hidden ${showAdvancedFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-gray-700">高級篩選</h3>
          <button
            onClick={resetAdvancedFilters}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            重置篩選
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 註冊日期範圍 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">註冊日期範圍</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={advancedFilters.dateRange.start}
                onChange={(e) => setAdvancedFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, start: e.target.value }
                }))}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
              />
              <input
                type="date"
                value={advancedFilters.dateRange.end}
                onChange={(e) => setAdvancedFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, end: e.target.value }
                }))}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
              />
            </div>
          </div>

          {/* 付款金額範圍 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">付款金額範圍</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="最小"
                value={advancedFilters.paymentAmount.min}
                onChange={(e) => setAdvancedFilters(prev => ({
                  ...prev,
                  paymentAmount: { ...prev.paymentAmount, min: e.target.value }
                }))}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
              />
              <input
                type="number"
                placeholder="最大"
                value={advancedFilters.paymentAmount.max}
                onChange={(e) => setAdvancedFilters(prev => ({
                  ...prev,
                  paymentAmount: { ...prev.paymentAmount, max: e.target.value }
                }))}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
              />
            </div>
          </div>

          {/* LINE 帳號 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">LINE 帳號</label>
            <select
              value={advancedFilters.hasLineId}
              onChange={(e) => setAdvancedFilters(prev => ({
                ...prev,
                hasLineId: e.target.value
              }))}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
            >
              <option value="ALL">全部</option>
              <option value="YES">有 LINE</option>
              <option value="NO">無 LINE</option>
            </select>
          </div>

          {/* 退費狀態 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">退費狀態</label>
            <select
              value={advancedFilters.refundStatus}
              onChange={(e) => setAdvancedFilters(prev => ({
                ...prev,
                refundStatus: e.target.value
              }))}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
            >
              <option value="ALL">全部</option>
              <option value="NONE">無退費</option>
              <option value="PENDING">退費處理中</option>
              <option value="COMPLETED">退費完成</option>
              <option value="REJECTED">退費被拒絕</option>
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <select
              value={advancedFilters.hasEmail}
              onChange={(e) => setAdvancedFilters(prev => ({
                ...prev,
                hasEmail: e.target.value
              }))}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
            >
              <option value="ALL">全部</option>
              <option value="YES">有 Email</option>
              <option value="NO">無 Email</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )

  // 計算統計數據
  const calculateDashboardData = (students) => {
    const totalStudents = students.length
    const activeStudents = students.filter(s => s.enrollmentStatus === 'ACTIVE').length
    
    // 計算總收入（已付款）
    const totalRevenue = students
      .filter(s => s.paymentStatus === 'PAID')
      .reduce((sum, s) => {
        const amount = parseInt(s.paymentAmount?.replace(/[^\d]/g, '') || '0')
        return sum + amount
      }, 0)

    // 計算待收款項
    const pendingPayments = students
      .filter(s => s.paymentStatus === 'PARTIAL' || s.paymentStatus === 'PENDING')
      .reduce((sum, s) => {
        const paid = parseInt(s.paymentAmount?.replace(/[^\d]/g, '') || '0')
        const coursePrice = getCoursePrice(s.course)
        const expected = parseInt(coursePrice.replace(/[^\d]/g, ''))
        return sum + (expected - paid)
      }, 0)

    // 課程統計
    const courseStats = students.reduce((acc, s) => {
      // 統一課程名稱顯示
      let course = s.course || '未指定'
      if (course === 'singing') course = '歌唱課'
      else if (course === 'guitar') course = '吉他課'
      else if (course === 'songwriting') course = '創作課'
      else if (course === 'band-workshop' || course === 'spring-composition-group' || course === '歌唱班') course = '春曲創作團班'
      
      if (!acc[course]) {
        acc[course] = { total: 0, paid: 0, active: 0 }
      }
      acc[course].total++
      if (s.paymentStatus === 'PAID') acc[course].paid++
      if (s.enrollmentStatus === 'ACTIVE') acc[course].active++
      return acc
    }, {})

    // 付款狀態統計
    const paymentStats = students.reduce((acc, s) => {
      let status = s.paymentStatus || 'UNPAID'
      // 將 PENDING 合併到 PARTIAL 中
      if (status === 'PENDING') {
        status = 'PARTIAL'
      }
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    // 月度趨勢（最近6個月）
    const monthlyTrends = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = date.toISOString().substring(0, 7)
      
      const monthStudents = students.filter(s => 
        s.createdAt?.substring(0, 7) === monthKey
      )
      
      monthlyTrends.push({
        month: monthKey,
        students: monthStudents.length,
        revenue: monthStudents
          .filter(s => s.paymentStatus === 'PAID')
          .reduce((sum, s) => sum + parseInt(s.paymentAmount?.replace(/[^\d]/g, '') || '0'), 0)
      })
    }

    return {
      totalStudents,
      activeStudents,
      totalRevenue,
      pendingPayments,
      courseStats,
      paymentStats,
      monthlyTrends
    }
  }

  // 統計儀表板組件
  const DashboardPanel = ({ students }) => {
    const stats = calculateDashboardData(students)
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 mb-6">
        {/* 標題和按鈕 - 始終顯示 */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">統計儀表板</h2>
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            {showDashboard ? '收起' : '展開'}
            <svg className={`w-4 h-4 transition-transform ${showDashboard ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* 儀表板內容 - 可摺疊 */}
        <div className={`transition-all duration-300 overflow-hidden ${showDashboard ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'}`}>

          {/* 關鍵指標 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-xs text-blue-600 font-medium">總學員數</div>
              <div className="text-xl font-bold text-blue-900">{stats.totalStudents}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-xs text-green-600 font-medium">活躍學員</div>
              <div className="text-xl font-bold text-green-900">{stats.activeStudents}</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="text-xs text-yellow-600 font-medium">總收入</div>
              <div className="text-xl font-bold text-yellow-900">NT$ {stats.totalRevenue.toLocaleString()}</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="text-xs text-red-600 font-medium">待收款</div>
              <div className="text-xl font-bold text-red-900">NT$ {stats.pendingPayments.toLocaleString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 課程統計 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">課程統計</h3>
              <div className="space-y-2">
                {Object.entries(stats.courseStats).map(([course, data]) => (
                  <div key={course} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">{course}</span>
                    <div className="text-xs text-gray-600">
                      總計: {data.total} | 已付: {data.paid} | 活躍: {data.active}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 付款狀態統計 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">付款狀態</h3>
              <div className="space-y-2">
                {Object.entries(stats.paymentStats).map(([status, count]) => {
                  const statusMap = {
                    'PAID': { label: '已付款', color: 'text-green-600 bg-green-50' },
                    'UNPAID': { label: '未付款', color: 'text-red-600 bg-red-50' },
                    'PARTIAL': { label: '部分付款', color: 'text-yellow-600 bg-yellow-50' }
                  }
                  const statusInfo = statusMap[status] || { label: status, color: 'text-gray-600 bg-gray-50' }
                  
                  return (
                    <div key={status} className={`flex justify-between items-center p-2 rounded ${statusInfo.color}`}>
                      <span className="text-sm font-medium">{statusInfo.label}</span>
                      <span className="text-sm font-bold">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 月度趨勢 */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">月度趨勢（最近6個月）</h3>
            <div className="grid grid-cols-6 gap-2">
              {stats.monthlyTrends.map((trend, index) => {
                const maxStudents = Math.max(...stats.monthlyTrends.map(t => t.students))
                const heightPercent = maxStudents > 0 ? (trend.students / maxStudents * 100) : 0
                
                return (
                  <div key={index} className="text-center">
                    <div className="h-20 flex items-end justify-center mb-1">
                      <div 
                        className="w-8 bg-blue-500 rounded-t"
                        style={{ height: `${Math.max(heightPercent, 5)}%` }}
                        title={`${trend.month}: ${trend.students}人, NT$ ${trend.revenue.toLocaleString()}`}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600">{trend.month.substring(5)}</div>
                    <div className="text-xs font-medium">{trend.students}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

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

    // 創建手機友好的彈窗
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
    modal.innerHTML = `
      <div class="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden">
        <div class="p-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">發送 LINE 訊息</h3>
          <p class="text-sm text-gray-600 mt-1">給 ${student.name}</p>
        </div>
        <div class="p-4">
          <textarea 
            id="messageInput" 
            class="w-full h-32 p-3 border border-gray-300 rounded-md resize-none text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="輸入訊息內容..."
          >您好 ${student.name}，關於您的${getCourseName(student.course)}報名...</textarea>
        </div>
        <div class="flex gap-2 p-4 border-t border-gray-200">
          <button 
            id="cancelBtn" 
            class="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button 
            id="sendBtn" 
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            發送
          </button>
        </div>
      </div>
    `
    
    document.body.appendChild(modal)
    
    // 自動聚焦到輸入框
    const textarea = modal.querySelector('#messageInput')
    textarea.focus()
    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    
    // 處理按鈕點擊
    modal.querySelector('#cancelBtn').onclick = () => modal.remove()
    modal.querySelector('#sendBtn').onclick = async () => {
      const message = textarea.value.trim()
      if (!message) {
        alert('請輸入訊息內容')
        return
      }
      
      modal.remove()
      
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
    
    // 點擊背景關閉
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove()
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

    // 創建手機友好的確認彈窗
    const confirmed = await new Promise((resolve) => {
      const confirmModal = document.createElement('div')
      confirmModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
      confirmModal.innerHTML = `
        <div class="bg-white rounded-lg w-full max-w-sm">
          <div class="p-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-800">確認發送</h3>
          </div>
          <div class="p-4">
            <p class="text-gray-700">您確定要發送補付提醒給 <span class="font-medium text-blue-600">${student.name}</span> 嗎？</p>
          </div>
          <div class="flex gap-2 p-4 border-t border-gray-200">
            <button 
              id="cancelConfirmBtn" 
              class="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button 
              id="confirmBtn" 
              class="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              發送提醒
            </button>
          </div>
        </div>
      `
      
      document.body.appendChild(confirmModal)
      
      // 處理按鈕點擊
      confirmModal.querySelector('#confirmBtn').onclick = () => {
        confirmModal.remove()
        resolve(true)
      }
      confirmModal.querySelector('#cancelConfirmBtn').onclick = () => {
        confirmModal.remove()
        resolve(false)
      }
      
      // 點擊背景關閉
      confirmModal.onclick = (e) => {
        if (e.target === confirmModal) {
          confirmModal.remove()
          resolve(false)
        }
      }
    })

    if (!confirmed) return

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
    const expectedAmount = parseInt(coursePrice.replace(/[^\d]/g, '')) || 0
    const paidAmount = parseInt(student.paymentAmount?.replace(/[^\d]/g, '') || '0')
    const shortAmount = expectedAmount - paidAmount
    return shortAmount > 0 ? shortAmount.toLocaleString() : '0'
  }

  // 歸檔管理相關函式
  const fetchArchivedStudents = async () => {
    try {
      const response = await fetch('/api/admin/archived-students')
      const data = await response.json()
      if (response.ok) {
        setArchivedStudents(data.students)
      } else {
        console.error('獲取歸檔學員失敗:', data.error)
      }
    } catch (error) {
      console.error('獲取歸檔學員時發生錯誤:', error)
    }
  }

  const handleArchiveStudent = async (studentId, reason) => {
    try {
      const response = await fetch('/api/admin/archive-refunded', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, reason })
      })
      
      const result = await response.json()
      if (response.ok) {
        alert(`✅ ${result.message}`)
        refreshStudents() // 刷新學員列表
      } else {
        alert(`❌ 歸檔失敗：${result.error}`)
      }
    } catch (error) {
      console.error('歸檔學員時發生錯誤:', error)
      alert('❌ 歸檔學員時發生錯誤')
    }
  }

  const handleRestoreStudent = async (studentId) => {
    try {
      const response = await fetch('/api/admin/archive-refunded', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId })
      })
      
      const result = await response.json()
      if (response.ok) {
        alert(`✅ ${result.message}`)
        fetchArchivedStudents() // 刷新歸檔列表
        refreshStudents() // 刷新學員列表
      } else {
        alert(`❌ 恢復失敗：${result.error}`)
      }
    } catch (error) {
      console.error('恢復學員時發生錯誤:', error)
      alert('❌ 恢復學員時發生錯誤')
    }
  }

  const handleAutoArchive = async () => {
    try {
      const response = await fetch('/api/admin/archive-refunded', {
        method: 'POST'
      })
      
      const result = await response.json()
      if (response.ok) {
        alert(`✅ ${result.message}`)
        refreshStudents() // 刷新學員列表
      } else {
        alert(`❌ 自動歸檔失敗：${result.error}`)
      }
    } catch (error) {
      console.error('自動歸檔時發生錯誤:', error)
      alert('❌ 自動歸檔時發生錯誤')
    }
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

  // 格式化日期的函式（只顯示日期）
  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })
  }

  // 課程代碼轉換為中文名稱的函式
  const getCourseName = (courseCode) => {
    const courseNames = {
      'singing': '歌唱課',
      'guitar': '吉他課',
      'songwriting': '創作課',
      'band-workshop': '春曲創作團班',
      'spring-composition-group': '春曲創作團班',
      '歌唱班': '春曲創作團班' // 將舊資料對應到春曲創作團班
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
      '春曲創作團班': 'NT$ 6,000',
      '歌唱班': 'NT$ 6,000' // 舊資料對應到春曲創作團班價格
    }
    return coursePrices[courseCode] || 'NT$ 3,000'
  }

  // 篩選學員的函式
  const filteredStudents = (students || []).filter(student => {
    // 基本搜索條件（姓名、Email、LINE ID）
    const matchesSearch = searchTerm === '' || 
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lineUserId?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // 付款狀態篩選
    const matchesPayment = paymentFilter === 'ALL' || 
      student.paymentStatus === paymentFilter ||
      (paymentFilter === 'PARTIAL' && student.paymentStatus === 'PENDING')
    
    // 報名狀態篩選
    const matchesEnrollment = enrollmentFilter === 'ALL' || 
      student.enrollmentStatus === enrollmentFilter
    
    // 課程篩選
    const matchesCourse = courseFilter === 'ALL' || 
      student.course === courseFilter || 
      getCourseName(student.course) === courseFilter

    // 高級篩選
    const matchesAdvanced = applyAdvancedFilters(student)
    
    return matchesSearch && matchesPayment && matchesEnrollment && matchesCourse && matchesAdvanced
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
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-bold text-slate-900">學員管理後台</h1>
          <a
            href="/admin/rich-menu"
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Rich Menu
          </a>
        </div>
        <div className="text-sm text-gray-600">
          顯示 {filteredStudents?.length || 0} / {students?.length || 0} 位學員
        </div>
      </div>

      {/* 桌面版標題 */}
      <div className="hidden sm:flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              學員管理後台
            </h1>
            <a
              href="/admin/rich-menu"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Rich Menu 管理
            </a>
          </div>
          {lastFetch && (
            <div className="flex items-center text-sm text-gray-500">
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

          {/* 歸檔管理按鈕 */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            title="歸檔管理"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6 6-6" />
            </svg>
            <span className="hidden sm:inline">歸檔管理</span>
            <span className="sm:hidden">歸檔</span>
          </button>

          {/* 自動歸檔按鈕 */}
          <button
            onClick={handleAutoArchive}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md transition-colors"
            title="自動歸檔30天前的退款學員"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">自動歸檔</span>
            <span className="sm:hidden">歸檔</span>
          </button>
        </div>
      </div>

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
        
        {/* 清除篩選和高級篩選按鈕 */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            高級篩選
            <svg className={`w-3 h-3 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={() => {
              setSearchTerm('')
              setPaymentFilter('ALL')
              setEnrollmentFilter('ALL')
              setCourseFilter('ALL')
              resetAdvancedFilters()
            }}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            清除所有篩選
          </button>
        </div>

        {/* 高級篩選面板 */}
        <AdvancedFiltersPanel />
      </div>

      {/* 統計儀表板 */}
      <DashboardPanel students={students} />

      {/* 學員列表區域 */}
      <div>
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
              <div>部分付款: {filteredStudents?.filter(s => s.paymentStatus === 'PARTIAL' || s.paymentStatus === 'PENDING').length || 0}</div>
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
              <span>部分付款: {filteredStudents?.filter(s => s.paymentStatus === 'PARTIAL' || s.paymentStatus === 'PENDING').length || 0}</span>
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
            {filteredStudents?.map((student) => {
              const isExpanded = expandedCards.has(student.id)
              
              return (
                <div key={student.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  {/* 卡片標題區域 - 始終顯示 */}
                  <div className="p-4">
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

                    {/* 基本資訊 - 始終顯示 */}
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

                      <div className="flex justify-between">
                        <span className="text-gray-600">註冊日期:</span>
                        <span className="text-gray-900">
                          {new Date(student.createdAt).toLocaleDateString('zh-TW')}
                        </span>
                      </div>
                    </div>

                    {/* 展開/收起按鈕 */}
                    <div className="mt-3 flex justify-center">
                      <button
                        onClick={() => toggleCardExpansion(student.id)}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <span>{isExpanded ? '收起詳細資訊' : '展開詳細資訊'}</span>
                        <svg 
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* 詳細資訊 - 可摺疊 */}
                  <div className={`transition-all duration-300 overflow-hidden ${
                    isExpanded ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="pt-4 space-y-3 text-sm">
                        {/* LINE 資訊 */}
                        {student.lineUserId && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">LINE ID:</span>
                            <div className="text-right">
                              <div className="text-green-600 text-xs font-mono">
                                {student.lineUserId?.substring(0, 12)}...
                              </div>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(student.lineUserId)
                                  alert('LINE ID 已複製到剪貼簿')
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                複製
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Email 資訊 */}
                        {student.email && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <div className="text-right">
                              <div className="text-gray-900 text-xs break-all">
                                {student.email}
                              </div>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(student.email)
                                  alert('Email 已複製到剪貼簿')
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                複製
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 付款金額 */}
                        {student.paymentAmount && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">付款金額:</span>
                            <span className="text-gray-900">NT$ {student.paymentAmount.toLocaleString()}</span>
                          </div>
                        )}

                        {/* 付款參考號碼 */}
                        {student.paymentReference && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">後五碼:</span>
                            <span className="text-gray-900 font-mono">{student.paymentReference}</span>
                          </div>
                        )}

                        {/* 付款時間 */}
                        {student.paymentDate && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">付款時間:</span>
                            <span className="text-gray-900 text-xs">{formatDateTime(student.paymentDate)}</span>
                          </div>
                        )}

                        {/* 退款狀態 */}
                        {student.refundStatus && student.refundStatus !== 'NONE' && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">退款狀態:</span>
                            <span className={`font-medium ${
                              student.refundStatus === 'PENDING' ? 'text-yellow-600' :
                              student.refundStatus === 'COMPLETED' ? 'text-green-600' :
                              student.refundStatus === 'REJECTED' ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {student.refundStatus === 'PENDING' ? '處理中' :
                               student.refundStatus === 'COMPLETED' ? '已完成' :
                               student.refundStatus === 'REJECTED' ? '已拒絕' : student.refundStatus}
                            </span>
                          </div>
                        )}

                        {/* 付款備註 */}
                        {student.paymentNotes && (
                          <div>
                            <span className="text-gray-600 text-sm">付款備註:</span>
                            <div className="mt-1 p-2 bg-gray-50 rounded text-xs text-gray-700">
                              {student.paymentNotes}
                            </div>
                          </div>
                        )}

                        {/* 課程價格資訊 */}
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <div className="text-blue-800 text-xs">
                            <div className="font-medium mb-1">📚 課程資訊</div>
                            <div>課程: {getCourseName(student.course)}</div>
                            <div>應付: {getCoursePrice(student.course)}</div>
                          </div>
                        </div>

                        {/* 部分付款詳細資訊 */}
                        {student.paymentStatus === 'PARTIAL' && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                            <div className="text-yellow-800 text-xs">
                              <div className="font-medium mb-1">💰 付款詳情</div>
                              <div>已付: NT$ {student.paymentAmount?.toLocaleString() || '0'}</div>
                              <div>尚需補付: NT$ {calculateShortAmount(student)}</div>
                              <div className="text-yellow-600 mt-1">⚠️ 需要補付</div>
                            </div>
                          </div>
                        )}

                        {/* 操作按鈕 */}
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex flex-wrap gap-2">
                            {/* 根據報名狀態顯示不同按鈕 */}
                            {student.enrollmentStatus === 'ACTIVE' ? (
                              student.paymentStatus === 'UNPAID' ? (
                                <button
                                  onClick={() => handleUpdateStatus(student.id, 'PAID')}
                                  className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                                >
                                  標記為已付款
                                </button>
                              ) : student.paymentStatus === 'PARTIAL' ? (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(student.id, 'PAID')}
                                    className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                                  >
                                    標記為已付款
                                  </button>
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
                                </>
                              ) : student.paymentStatus === 'PAID' ? (
                                <button
                                  onClick={() => handleUpdateStatus(student.id, 'UNPAID')}
                                  className="px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors"
                                >
                                  標記為未付款
                                </button>
                              ) : null
                            ) : student.enrollmentStatus === 'CANCELLED' ? (
                              <>
                                <button
                                  onClick={() => handleRestoreEnrollment(student.id)}
                                  className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                                >
                                  恢復報名
                                </button>
                                {student.refundStatus === 'NONE' ? (
                                  <button
                                    onClick={() => handleRefund(student.id, 'PENDING')}
                                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                                  >
                                    處理退款
                                  </button>
                                ) : student.refundStatus === 'PENDING' ? (
                                  <button
                                    onClick={() => handleRefund(student.id, 'COMPLETED')}
                                    className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                                  >
                                    完成退款
                                  </button>
                                ) : (
                                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                                    已退款
                                  </span>
                                )}
                              </>
                            ) : null}

                            {/* 通用聯繫按鈕 */}
                            <button
                              onClick={() => handleSendLineMessage(student.id)}
                              className="px-3 py-1 bg-purple-600 text-white text-xs rounded-md hover:bg-purple-700 transition-colors"
                              title={`聯繫 ${student.name}`}
                            >
                              💬 聯繫
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 桌面版：表格顯示 */}
          <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left table-fixed">
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
                <th className="px-6 py-3 text-sm font-semibold text-slate-900 w-20">姓名</th>
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
                  <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{student.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                      {getCourseName(student.course)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="text-xs">
                      {student.lineUserId ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-green-700">已連結 LINE</span>
                          <span className="text-slate-500 font-mono text-xs">
                            ID: {student.lineUserId?.substring(0, 8)}...
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(student.lineUserId)
                              alert('LINE ID 已複製到剪貼簿！')
                            }}
                            className="text-blue-600 hover:text-blue-800 underline text-xs"
                          >
                            複製完整 ID
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">未連結</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDate(student.createdAt)}</td>
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
                    {student.refundStatus === 'COMPLETED' ? (
                      <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                        已退款
                      </span>
                    ) : student.paymentStatus === 'PAID' ? (
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
                    {student.refundStatus === 'COMPLETED' ? (
                      <div className="space-y-2">
                        {/* 已退款的基本資訊 */}
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                            💰 已退款
                          </span>
                          <span className="text-blue-600 font-medium">{getCourseName(student.course)}</span>
                          <span className="text-purple-600 font-medium">{getCoursePrice(student.course)}</span>
                        {student.paymentReference && (
                            <span className="text-gray-600">後五碼: {student.paymentReference}</span>
                          )}
                        </div>
                        
                        {/* 可展開的詳細資訊 */}
                        <details className="group">
                          <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800 flex items-center gap-1 w-fit">
                            <span>展開詳情</span>
                            <svg className="w-3 h-3 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </summary>
                          <div className="mt-2 space-y-1 pl-2 border-l-2 border-red-200">
                        {student.paymentAmount && (
                              <div className="text-xs">
                                <span className="text-gray-600">原付款:</span>
                                <span className="ml-1 font-medium text-gray-600 line-through">{student.paymentAmount}</span>
                              </div>
                            )}
                            {student.paymentDate && (
                              <div className="text-xs text-gray-500">
                                付款時間: {formatDateTime(student.paymentDate)}
                              </div>
                            )}
                            <div className="text-xs text-red-800 font-medium">
                              💰 已辦理退款
                            </div>
                            {student.paymentNotes && (
                              <div className="text-xs">
                                <span className="text-gray-600">備註:</span>
                                <div className="mt-1 p-2 bg-red-50 rounded border text-gray-700 max-w-80">
                                  <div className="whitespace-pre-wrap leading-relaxed text-xs">
                                    {student.paymentNotes}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </details>
                      </div>
                    ) : student.paymentStatus === 'PAID' ? (
                      <div className="space-y-2">
                        {/* 簡潔的基本資訊 - 全部在一行 */}
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            ✅ 已付款
                          </span>
                          <span className="text-blue-600 font-medium">{getCourseName(student.course)}</span>
                          <span className="text-purple-600 font-medium">{getCoursePrice(student.course)}</span>
                          {student.paymentReference && (
                            <span className="text-gray-600">後五碼: {student.paymentReference}</span>
                          )}
                        </div>
                        
                        {/* 可展開的詳細資訊 */}
                        <details className="group">
                          <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800 flex items-center gap-1 w-fit">
                            <span>展開詳情</span>
                            <svg className="w-3 h-3 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </summary>
                          <div className="mt-2 space-y-1 pl-2 border-l-2 border-gray-200">
                            {student.paymentAmount && (
                              <div className="text-xs">
                                <span className="text-gray-600">實付:</span>
                                <span className={`ml-1 font-medium ${
                            isPaymentAmountCorrect(student.course, student.paymentAmount) 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                                  {student.paymentAmount}
                                  {isPaymentAmountCorrect(student.course, student.paymentAmount) === true && (
                                    <span className="ml-1">✅</span>
                                  )}
                            {isPaymentAmountCorrect(student.course, student.paymentAmount) === false && (
                                    <span className="ml-1">❌</span>
                            )}
                                </span>
                              </div>
                            )}
                            {student.paymentDate && (
                              <div className="text-xs text-gray-500">
                                時間: {formatDateTime(student.paymentDate)}
                          </div>
                        )}
                            {student.paymentNotes && (
                              <div className="text-xs">
                                <span className="text-gray-600">備註:</span>
                                <div className="mt-1 p-2 bg-gray-50 rounded border text-gray-700 max-w-80">
                                  <div className="whitespace-pre-wrap leading-relaxed text-xs">
                                    {student.paymentNotes}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </details>
                      </div>
                    ) : student.paymentStatus === 'PARTIAL' ? (
                      <div className="space-y-2">
                        {/* 簡潔的基本資訊 - 全部在一行 */}
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                            ⚠️ 部分付款
                          </span>
                          <span className="text-blue-600 font-medium">{getCourseName(student.course)}</span>
                          <span className="text-purple-600 font-medium">{getCoursePrice(student.course)}</span>
                          {student.paymentReference && (
                            <span className="text-gray-600">後五碼: {student.paymentReference}</span>
                          )}
                        </div>
                        
                        {/* 可展開的詳細資訊 */}
                        <details className="group">
                          <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800 flex items-center gap-1 w-fit">
                            <span>展開詳情</span>
                            <svg className="w-3 h-3 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </summary>
                          <div className="mt-2 space-y-1 pl-2 border-l-2 border-yellow-200">
                            {student.paymentAmount && (
                              <div className="text-xs">
                                <span className="text-gray-600">已付:</span>
                                <span className="ml-1 font-medium text-orange-600">{student.paymentAmount}</span>
                              </div>
                            )}
                            {(() => {
                              const expectedPrice = getCoursePrice(student.course)
                              const expectedNumber = parseInt(expectedPrice.replace(/[^\d]/g, ''))
                              const paidNumber = student.paymentAmount ? parseInt(student.paymentAmount.replace(/[^\d]/g, '')) : 0
                              const shortAmount = expectedNumber - paidNumber
                              return shortAmount > 0 ? (
                                <div className="text-xs">
                                  <span className="text-gray-600">尚需:</span>
                                  <span className="ml-1 font-medium text-red-600">{shortAmount} 元</span>
                                </div>
                              ) : null
                            })()}
                        {student.paymentDate && (
                              <div className="text-xs text-gray-500">
                                時間: {formatDateTime(student.paymentDate)}
                              </div>
                        )}
                            <div className="text-xs text-yellow-800 font-medium">
                              ⚠️ 需要補付
                            </div>
                        {student.paymentNotes && (
                              <div className="text-xs">
                                <span className="text-gray-600">備註:</span>
                                <div className="mt-1 p-2 bg-yellow-50 rounded border text-gray-700 max-w-80">
                                  <div className="whitespace-pre-wrap leading-relaxed text-xs">
                                    {student.paymentNotes}
                                  </div>
                                </div>
                          </div>
                        )}
                          </div>
                        </details>
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

      {/* 歸檔學員顯示區域 */}
      {showArchived && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">歸檔學員</h3>
            <button
              onClick={fetchArchivedStudents}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              刷新歸檔列表
            </button>
          </div>
          
          {archivedStudents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暫無歸檔學員</p>
          ) : (
            <div className="space-y-2">
              {archivedStudents.map((student) => (
                <div key={student.id} className="bg-white p-3 rounded border flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{student.name}</div>
                    <div className="text-sm text-gray-500">
                      {getCourseName(student.course)} | 
                      退款日期: {student.refundDate ? new Date(student.refundDate).toLocaleDateString() : '未知'} |
                      歸檔日期: {student.archivedAt ? new Date(student.archivedAt).toLocaleDateString() : '未知'}
                    </div>
                    {student.archiveReason && (
                      <div className="text-xs text-gray-400 mt-1">
                        歸檔原因: {student.archiveReason}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRestoreStudent(student.id)}
                    className="ml-4 px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    恢復
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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
            onClick={() => {
              setShowArchived(!showArchived)
              if (!showArchived) {
                fetchArchivedStudents()
              }
            }}
            className={`flex flex-col items-center justify-center py-2 px-1 text-xs rounded-md transition-colors ${
              showArchived 
                ? 'text-blue-600 bg-blue-50' 
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
            title="歸檔管理"
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6 6-6" />
            </svg>
            <span>歸檔</span>
          </button>

          <button
            onClick={handleAutoArchive}
            className="flex flex-col items-center justify-center py-2 px-1 text-xs text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
            title="自動歸檔30天前的退款學員"
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>歸檔</span>
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