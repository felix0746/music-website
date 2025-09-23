'use client'

import { useState, useEffect } from 'react'

export default function AdminPage() {
  const [students, setStudents] = useState([])
  const [isLoading, setIsLoading] = useState(true)

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

  // 格式化日期時間的函式
  const formatDateTime = (isoString) => {
    return new Date(isoString).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-8">
        學員管理後台
      </h1>
      {isLoading ? ( <p>正在載入學員資料...</p> ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">姓名</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">課程</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">註冊日期</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">付款狀態</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">付款資訊</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="px-6 py-4 text-sm text-slate-700">{student.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{student.course || '未指定'}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDateTime(student.createdAt)}</td>
                  <td className="px-6 py-4 text-sm">
                    {student.paymentStatus === 'PAID' ? (
                      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        已付款
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                        尚未付款
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {student.paymentStatus === 'PAID' ? (
                      <div className="text-xs">
                        {student.paymentReference && <div>後五碼: {student.paymentReference}</div>}
                        {student.paymentAmount && <div>金額: {student.paymentAmount}</div>}
                        {student.paymentDate && <div>付款時間: {formatDateTime(student.paymentDate)}</div>}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      {student.paymentStatus === 'UNPAID' ? (
                        <button
                          onClick={() => handleUpdateStatus(student.id, 'PAID')}
                          className="rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                        >
                          標記為已付款
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(student.id, 'UNPAID')}
                          className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                        >
                          標記為未付款
                        </button>
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