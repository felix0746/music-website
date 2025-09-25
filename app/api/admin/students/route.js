import { prisma } from '../../../../lib/prisma'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const paymentStatus = searchParams.get('paymentStatus')
    const enrollmentStatus = searchParams.get('enrollmentStatus')
    const course = searchParams.get('course')

    // 構建查詢條件
    const where = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { lineUserId: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (paymentStatus && paymentStatus !== 'ALL') {
      where.paymentStatus = paymentStatus
    }
    
    if (enrollmentStatus && enrollmentStatus !== 'ALL') {
      where.enrollmentStatus = enrollmentStatus
    }
    
    if (course && course !== 'ALL') {
      where.course = course
    }

    // 並行查詢：資料和總數
    const [students, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit,
        // 只選擇需要的欄位，減少資料傳輸
        select: {
          id: true,
          lineUserId: true,
          name: true,
          email: true,
          course: true,
          createdAt: true,
          paymentStatus: true,
          paymentAmount: true,
          paymentDate: true,
          paymentNotes: true,
          enrollmentStatus: true,
          enrollmentDate: true,
          cancellationDate: true,
          cancellationReason: true,
          refundStatus: true,
          refundAmount: true,
          refundDate: true
        }
      }),
      prisma.user.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)
    
    return Response.json({
      students,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })
  } catch (error) {
    console.error('獲取學員資料時發生錯誤:', error)
    
    return Response.json(
      { 
        error: '資料庫查詢失敗', 
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}