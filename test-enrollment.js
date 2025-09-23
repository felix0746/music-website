// 測試 LINE 報名流程
const testData = {
  lineUserId: 'U1234567890abcdef1234567890abcdef',
  name: '測試學員',
  course: 'singing'
}

console.log('測試報名資料：', testData)

// 模擬調用 line-enroll API
fetch('http://localhost:3000/api/line-enroll', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testData)
})
.then(response => response.json())
.then(data => {
  console.log('報名結果：', data)
})
.catch(error => {
  console.error('測試錯誤：', error)
})
