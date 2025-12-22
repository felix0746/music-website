'use client'

import { useState, useEffect } from 'react'

export default function RichMenuPage() {
  const [richMenus, setRichMenus] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRichMenuId, setSelectedRichMenuId] = useState('')
  const [uploadImage, setUploadImage] = useState(null)
  const [result, setResult] = useState({ type: '', message: '', details: null })

  const API_BASE = '/api/admin/rich-menu'

  // 載入 Rich Menu 列表
  const loadRichMenus = async () => {
    setIsLoading(true)
    setResult({ type: '', message: '', details: null })
    try {
      const response = await fetch(API_BASE)
      const data = await response.json()
      
      if (data.success) {
        setRichMenus(data.richMenus || [])
        setResult({ 
          type: 'success', 
          message: `找到 ${data.count || 0} 個 Rich Menu`,
          details: null 
        })
      } else {
        setResult({ 
          type: 'error', 
          message: data.error || '查詢失敗',
          details: data.details 
        })
      }
    } catch (error) {
      setResult({ 
        type: 'error', 
        message: '查詢失敗: ' + error.message,
        details: null 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 創建新的 Rich Menu
  const createRichMenu = async () => {
    setIsLoading(true)
    setResult({ type: '', message: '', details: null })
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create'
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSelectedRichMenuId(data.richMenuId)
        setResult({ 
          type: 'success', 
          message: `Rich Menu 創建成功！ID: ${data.richMenuId}`,
          details: data 
        })
        // 重新載入列表
        await loadRichMenus()
      } else {
        setResult({ 
          type: 'error', 
          message: data.error || '創建失敗',
          details: data.details 
        })
      }
    } catch (error) {
      setResult({ 
        type: 'error', 
        message: '創建失敗: ' + error.message,
        details: null 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 上傳圖片
  const uploadRichMenuImage = async () => {
    // 驗證必要參數
    if (!selectedRichMenuId || selectedRichMenuId.trim() === '') {
      setResult({ 
        type: 'error', 
        message: '請先選擇或創建 Rich Menu',
        details: null 
      })
      return
    }

    if (!uploadImage) {
      setResult({ 
        type: 'error', 
        message: '請選擇圖片檔案',
        details: null 
      })
      return
    }

    // 驗證檔案大小
    if (uploadImage.size > 1024 * 1024) {
      setResult({ 
        type: 'error', 
        message: '檔案大小超過 1MB，請壓縮圖片',
        details: null 
      })
      return
    }

    setIsLoading(true)
    setResult({ type: '', message: '', details: null })
    
    try {
      const formData = new FormData()
      formData.append('richMenuId', selectedRichMenuId)
      formData.append('image', uploadImage)

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setResult({ 
          type: 'success', 
          message: '圖片上傳成功！',
          details: data 
        })
        setUploadImage(null)
        // 清除檔案選擇
        const fileInput = document.getElementById('imageFile')
        if (fileInput) fileInput.value = ''
      } else {
        setResult({ 
          type: 'error', 
          message: data.error || '上傳失敗',
          details: data.details || data.availableRichMenuIds 
        })
      }
    } catch (error) {
      setResult({ 
        type: 'error', 
        message: '上傳失敗: ' + error.message,
        details: null 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 設定為預設
  const setAsDefault = async (richMenuId) => {
    setIsLoading(true)
    setResult({ type: '', message: '', details: null })
    
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'set_default',
          richMenuId: richMenuId || selectedRichMenuId
        })
      })

      const data = await response.json()

      if (data.success) {
        setResult({ 
          type: 'success', 
          message: 'Rich Menu 已設定為預設！請完全關閉並重新打開 LINE 查看效果。',
          details: data 
        })
      } else {
        setResult({ 
          type: 'error', 
          message: data.error || '設定失敗',
          details: data.details 
        })
      }
    } catch (error) {
      setResult({ 
        type: 'error', 
        message: '設定失敗: ' + error.message,
        details: null 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 刪除 Rich Menu
  const deleteRichMenu = async (richMenuId) => {
    if (!confirm(`確定要刪除 Rich Menu ${richMenuId} 嗎？此操作無法復原。`)) {
      return
    }

    setIsLoading(true)
    setResult({ type: '', message: '', details: null })
    
    try {
      const response = await fetch(`${API_BASE}?richMenuId=${richMenuId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setResult({ 
          type: 'success', 
          message: 'Rich Menu 刪除成功',
          details: null 
        })
        // 重新載入列表
        await loadRichMenus()
        if (selectedRichMenuId === richMenuId) {
          setSelectedRichMenuId('')
        }
      } else {
        setResult({ 
          type: 'error', 
          message: data.error || '刪除失敗',
          details: data.details 
        })
      }
    } catch (error) {
      setResult({ 
        type: 'error', 
        message: '刪除失敗: ' + error.message,
        details: null 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 頁面載入時自動載入列表
  useEffect(() => {
    loadRichMenus()
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Rich Menu 管理</h1>
        <p className="text-gray-600">管理 LINE Bot 的圖文選單（Rich Menu）</p>
      </div>

      {/* 操作按鈕區 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={loadRichMenus}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重新載入列表
          </button>
          <button
            onClick={createRichMenu}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            創建新的 Rich Menu
          </button>
        </div>

        {/* 結果訊息 */}
        {result.message && result.message.trim() !== '' && (
          <div className={`p-4 rounded-lg mb-4 ${
            result.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
            result.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
            'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-start gap-2">
              {result.type === 'success' && (
                <svg className="w-5 h-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {result.type === 'error' && (
                <svg className="w-5 h-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <div className="flex-1">
                <p className="font-semibold">{result.message}</p>
                {result.details && typeof result.details === 'object' && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm">查看詳細資訊</summary>
                    <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
                {result.details && Array.isArray(result.details) && result.details.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-semibold">可用的 Rich Menu ID：</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {result.details.map((id, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedRichMenuId(id)}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rich Menu 列表 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Rich Menu 列表</h2>
        
        {isLoading && richMenus.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">載入中...</p>
          </div>
        ) : richMenus.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>目前沒有 Rich Menu</p>
            <p className="text-sm mt-2">點擊「創建新的 Rich Menu」按鈕開始</p>
          </div>
        ) : (
          <div className="space-y-4">
            {richMenus.map((rm, index) => (
              <div 
                key={rm.richMenuId} 
                className={`border rounded-lg p-4 ${
                  selectedRichMenuId === rm.richMenuId 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">Rich Menu #{index + 1}</span>
                      {selectedRichMenuId === rm.richMenuId && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                          已選擇
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><strong>ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{rm.richMenuId}</code></p>
                      <p><strong>名稱:</strong> {rm.name || '未命名'}</p>
                      <p><strong>尺寸:</strong> {rm.size?.width || '?'} x {rm.size?.height || '?'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setSelectedRichMenuId(rm.richMenuId)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      選擇
                    </button>
                    <button
                      onClick={() => setAsDefault(rm.richMenuId)}
                      disabled={isLoading}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      設為預設
                    </button>
                    <button
                      onClick={() => deleteRichMenu(rm.richMenuId)}
                      disabled={isLoading}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 上傳圖片區 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">上傳 Rich Menu 圖片</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rich Menu ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={selectedRichMenuId}
                onChange={(e) => setSelectedRichMenuId(e.target.value)}
                placeholder="選擇上方的 Rich Menu 或手動輸入 ID"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {selectedRichMenuId && (
                <button
                  onClick={() => setSelectedRichMenuId('')}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  清除
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              選擇圖片檔案
            </label>
            <input
              id="imageFile"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={(e) => setUploadImage(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              規格：2500 x 1686 像素，PNG 或 JPEG，&lt; 1MB
            </p>
            {uploadImage && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                <p><strong>檔案名稱:</strong> {uploadImage.name}</p>
                <p><strong>檔案大小:</strong> {(uploadImage.size / 1024).toFixed(2)} KB</p>
                <p><strong>檔案類型:</strong> {uploadImage.type}</p>
              </div>
            )}
          </div>

          <button
            onClick={uploadRichMenuImage}
            disabled={isLoading || !selectedRichMenuId || !uploadImage}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            上傳圖片
          </button>
        </div>
      </div>

      {/* 使用說明 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📋 使用說明</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>點擊「重新載入列表」查看所有 Rich Menu</li>
          <li>點擊「創建新的 Rich Menu」創建新的 Rich Menu</li>
          <li>選擇一個 Rich Menu，然後上傳圖片（必須先上傳圖片才能設定為預設）</li>
          <li>上傳成功後，點擊「設為預設」按鈕</li>
          <li>完全關閉並重新打開 LINE 應用程式查看效果</li>
        </ol>
      </div>
      </div>
    </div>
  )
}

