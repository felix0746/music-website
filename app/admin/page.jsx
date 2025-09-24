'use client'

import { useState, useEffect } from 'react'

export default function AdminPage() {
  const [students, setStudents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [enrollmentFilter, setEnrollmentFilter] = useState('ALL')
  const [courseFilter, setCourseFilter] = useState('ALL')

  // 獲取學生資料的函式
  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/students')
      const data = await response.json()
      setStudents(data)
    } catch (error) {
      console.error("無法獲取學生資料:", error)
      alert('無法載入學生資料，請稍後再試。')
    } finally {
      setIsLoading(false)
    }
  }

  // 頁面載入時執行一次
  useEffect(() => {
    fetchStudents()
  }, [])

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
      alert('更新成功！')
    } catch (error) {
      console.error("更新付款狀態失敗:", error)
      alert('更新狀態時發生錯誤。')
    }
  }

  // 發送補付提醒的函式
  const handleSendSupplementReminder = async (studentId) => {
    const student = students.find(s => s.id === studentId)
    if (!student) return

    if (!confirm(`您確定要發送補付提醒給 ${student.name} 嗎？`)) {
      return
    }

    try {
      // 這裡可以整合 LINE API 發送提醒訊息
      // 暫時使用 alert 顯示提醒內容
      const expectedPrice = getCoursePrice(student.course)
      const expectedNumber = parseInt(expectedPrice.replace(/[^\d]/g, ''))
      const paidNumber = student.paymentAmount ? parseInt(student.paymentAmount.replace(/[^\d]/g, '')) : 0
      const shortAmount = expectedNumber - paidNumber

      const reminderMessage = `補付提醒已準備發送給 ${student.name}：

課程：${getCourseName(student.course)}
應付金額：${expectedPrice}
已付金額：${student.paymentAmount || '0'}
尚需補付：${shortAmount} 元

提醒內容：
請盡快補付剩餘金額 ${shortAmount} 元，以完成課程報名。

注意：此功能需要整合 LINE API 才能實際發送訊息。`

      alert(reminderMessage)
    } catch (error) {
      console.error("發送補付提醒失敗:", error)
      alert('發送補付提醒時發生錯誤。')
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
      
      alert(`已成功恢復 ${student.name} 的報名狀態！`)
    } catch (error) {
      console.error("恢復報名狀態失敗:", error)
      alert('恢復報名狀態時發生錯誤。')
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
  const filteredStudents = students.filter(student => {
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

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          學員管理後台
        </h1>
        <button
          onClick={fetchStudents}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              載入中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              刷新資料
            </>
          )}
        </button>
      </div>
      
      {/* 搜索和篩選區域 */}
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 搜索框 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              搜索學員姓名
            </label>
            <input
              type="text"
              placeholder="輸入學員姓名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            顯示 {filteredStudents.length} / {students.length} 位學員
          </div>
          <div className="flex gap-4">
            <span>已付款: {filteredStudents.filter(s => s.paymentStatus === 'PAID').length}</span>
            <span>部分付款: {filteredStudents.filter(s => s.paymentStatus === 'PARTIAL').length}</span>
            <span>尚未付款: {filteredStudents.filter(s => s.paymentStatus === 'UNPAID').length}</span>
          </div>
        </div>
      </div>
      
      {isLoading ? ( <p>正在載入學員資料...</p> ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">姓名</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">課程</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">註冊日期</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">報名狀態</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">付款狀態</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">退款狀態</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">付款資訊</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td className="px-6 py-4 text-sm text-slate-700">{student.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                      {getCourseName(student.course)}
                    </span>
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
                    <div className="flex gap-2">
                      {student.enrollmentStatus === 'ACTIVE' ? (
                        student.paymentStatus === 'UNPAID' ? (
                          <button
                            onClick={() => handleUpdateStatus(student.id, 'PAID')}
                            className="rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                          >
                            標記為已付款
                          </button>
                        ) : student.paymentStatus === 'PARTIAL' ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleUpdateStatus(student.id, 'PAID')}
                              className="rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                            >
                              標記為已付款
                            </button>
                            <button
                              onClick={() => handleSendSupplementReminder(student.id)}
                              className="rounded bg-yellow-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-yellow-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
                            >
                              發送補付提醒
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(student.id, 'UNPAID')}
                            className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                          >
                            標記為未付款
                          </button>
                        )
                      ) : student.enrollmentStatus === 'CANCELLED' ? (
                        <div className="flex gap-1">
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
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}