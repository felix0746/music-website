'use client'

import { useState, useEffect } from 'react'

export default function DebugPage() {
  const [debugData, setDebugData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDebugData()
  }, [])

  const fetchDebugData = async () => {
    try {
      const response = await fetch('/api/debug/student-count')
      const data = await response.json()
      setDebugData(data)
    } catch (error) {
      console.error('獲取調試資料失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="p-8">載入中...</div>
  }

  if (!debugData) {
    return <div className="p-8">無法載入資料</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">資料庫調試資訊</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">基本統計</h2>
        <p>總學員數：{debugData.totalCount}</p>
        <p>狀態：{debugData.success ? '成功' : '失敗'}</p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">付款狀態統計</h2>
        <ul>
          {debugData.statusStats.map((stat, index) => (
            <li key={index}>
              {stat.paymentStatus}: {stat._count.paymentStatus} 人
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">報名狀態統計</h2>
        <ul>
          {debugData.enrollmentStats.map((stat, index) => (
            <li key={index}>
              {stat.enrollmentStatus}: {stat._count.enrollmentStatus} 人
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">所有學員資料</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">ID</th>
                <th className="border border-gray-300 px-4 py-2">姓名</th>
                <th className="border border-gray-300 px-4 py-2">課程</th>
                <th className="border border-gray-300 px-4 py-2">付款狀態</th>
                <th className="border border-gray-300 px-4 py-2">報名狀態</th>
                <th className="border border-gray-300 px-4 py-2">註冊時間</th>
              </tr>
            </thead>
            <tbody>
              {debugData.students.map((student) => (
                <tr key={student.id}>
                  <td className="border border-gray-300 px-4 py-2">{student.id}</td>
                  <td className="border border-gray-300 px-4 py-2">{student.name || '未填寫'}</td>
                  <td className="border border-gray-300 px-4 py-2">{student.course || '未填寫'}</td>
                  <td className="border border-gray-300 px-4 py-2">{student.paymentStatus}</td>
                  <td className="border border-gray-300 px-4 py-2">{student.enrollmentStatus}</td>
                  <td className="border border-gray-300 px-4 py-2">
                    {student.createdAt ? new Date(student.createdAt).toLocaleString('zh-TW') : '未知'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button
        onClick={fetchDebugData}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        重新載入
      </button>
    </div>
  )
}
