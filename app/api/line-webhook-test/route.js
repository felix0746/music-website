export async function POST(request) {
  try {
    const body = await request.text()
    console.log('收到 Webhook 請求:', body)
    
    const events = JSON.parse(body).events
    console.log('解析的事件:', events)

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const message = event.message.text.trim()
        console.log('收到的訊息:', message)
        
        // 簡單的訊息解析測試
        if (message.includes('姓名:') && message.includes('課程:')) {
          console.log('✅ 檢測到報名格式')
          return Response.json({ 
            success: true, 
            message: '檢測到報名格式',
            detectedMessage: message
          })
        } else {
          console.log('❌ 未檢測到報名格式')
          return Response.json({ 
            success: false, 
            message: '未檢測到報名格式',
            receivedMessage: message
          })
        }
      }
    }

    return Response.json({ success: true, message: '處理完成' })
  } catch (error) {
    console.error('Webhook 測試錯誤:', error)
    return Response.json({ 
      error: 'Webhook 測試失敗', 
      details: error.message 
    }, { status: 500 })
  }
}
