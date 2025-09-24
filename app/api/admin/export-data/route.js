import { PrismaClient } from '@prisma/client'

let prisma

function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

export async function POST(request) {
  try {
    const { format, filters, fields } = await request.json()

    if (!format) {
      return Response.json(
        { error: '缺少匯出格式' },
        { status: 400 }
      )
    }

    const prismaInstance = getPrisma()

    // 構建查詢條件
    const whereClause = {}
    
    if (filters) {
      if (filters.paymentStatus && filters.paymentStatus !== 'ALL') {
        whereClause.paymentStatus = filters.paymentStatus
      }
      if (filters.enrollmentStatus && filters.enrollmentStatus !== 'ALL') {
        whereClause.enrollmentStatus = filters.enrollmentStatus
      }
      if (filters.course && filters.course !== 'ALL') {
        whereClause.course = filters.course
      }
      if (filters.searchTerm) {
        whereClause.name = {
          contains: filters.searchTerm,
          mode: 'insensitive'
        }
      }
      if (filters.dateFrom) {
        whereClause.createdAt = {
          gte: new Date(filters.dateFrom)
        }
      }
      if (filters.dateTo) {
        whereClause.createdAt = {
          ...whereClause.createdAt,
          lte: new Date(filters.dateTo)
        }
      }
    }

    // 獲取學員資料
    const students = await prismaInstance.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    })

    if (students.length === 0) {
      return Response.json(
        { error: '沒有找到符合條件的資料' },
        { status: 404 }
      )
    }

    // 根據格式處理資料
    let exportData
    let mimeType
    let filename

    switch (format) {
      case 'csv':
        exportData = generateCSV(students, fields)
        mimeType = 'text/csv'
        filename = `學員資料_${new Date().toISOString().split('T')[0]}.csv`
        break

      case 'json':
        exportData = JSON.stringify(students, null, 2)
        mimeType = 'application/json'
        filename = `學員資料_${new Date().toISOString().split('T')[0]}.json`
        break

      case 'excel':
        exportData = generateExcel(students, fields)
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename = `學員資料_${new Date().toISOString().split('T')[0]}.xlsx`
        break

      default:
        return Response.json(
          { error: '不支援的匯出格式' },
          { status: 400 }
        )
    }

    return new Response(exportData, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('匯出資料失敗:', error)
    return Response.json(
      { error: '匯出資料失敗: ' + error.message },
      { status: 500 }
    )
  }
}

// 生成 CSV 格式
function generateCSV(students, fields) {
  const defaultFields = [
    'id', 'name', 'email', 'course', 'paymentStatus', 'paymentAmount',
    'enrollmentStatus', 'createdAt', 'paymentDate', 'lineUserId'
  ]
  
  const selectedFields = fields || defaultFields
  
  // CSV 標題行
  const headers = selectedFields.map(field => getFieldDisplayName(field)).join(',')
  
  // CSV 資料行
  const rows = students.map(student => {
    return selectedFields.map(field => {
      let value = student[field]
      
      // 處理特殊欄位
      if (field === 'course') {
        value = getCourseName(value)
      } else if (field === 'paymentStatus') {
        value = getPaymentStatusName(value)
      } else if (field === 'enrollmentStatus') {
        value = getEnrollmentStatusName(value)
      } else if (field === 'createdAt' || field === 'paymentDate') {
        value = value ? new Date(value).toLocaleString('zh-TW') : ''
      } else if (value === null || value === undefined) {
        value = ''
      }
      
      // 處理包含逗號的值
      if (typeof value === 'string' && value.includes(',')) {
        value = `"${value}"`
      }
      
      return value
    }).join(',')
  })
  
  return [headers, ...rows].join('\n')
}

// 生成 Excel 格式（簡化版，實際應用中可以使用 xlsx 庫）
function generateExcel(students, fields) {
  // 這裡返回 CSV 格式，實際應用中應該使用 xlsx 庫
  return generateCSV(students, fields)
}

// 輔助函數
function getFieldDisplayName(field) {
  const fieldNames = {
    'id': 'ID',
    'name': '姓名',
    'email': '電子郵件',
    'course': '課程',
    'paymentStatus': '付款狀態',
    'paymentAmount': '付款金額',
    'enrollmentStatus': '報名狀態',
    'createdAt': '報名時間',
    'paymentDate': '付款時間',
    'lineUserId': 'LINE ID'
  }
  return fieldNames[field] || field
}

function getCourseName(courseCode) {
  const courseNames = {
    'singing': '歌唱課',
    'guitar': '吉他課',
    'songwriting': '創作課',
    'band-workshop': '春曲創作團班',
    'spring-composition-group': '春曲創作團班'
  }
  return courseNames[courseCode] || courseCode || '未指定'
}

function getPaymentStatusName(status) {
  const statusNames = {
    'UNPAID': '尚未付款',
    'PAID': '已付款',
    'PARTIAL': '部分付款',
    'PENDING': '待補付'
  }
  return statusNames[status] || status
}

function getEnrollmentStatusName(status) {
  const statusNames = {
    'ACTIVE': '有效報名',
    'CANCELLED': '已取消',
    'COMPLETED': '已完成'
  }
  return statusNames[status] || status
}
