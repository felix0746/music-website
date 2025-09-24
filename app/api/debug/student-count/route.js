import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // 獲取總學員數
    const totalCount = await prisma.user.count()
    
    // 獲取所有學員資料
    const allStudents = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        course: true,
        paymentStatus: true,
        enrollmentStatus: true,
        createdAt: true
      }
    })
    
    // 按狀態分組統計
    const statusStats = await prisma.user.groupBy({
      by: ['paymentStatus'],
      _count: { paymentStatus: true }
    })
    
    const enrollmentStats = await prisma.user.groupBy({
      by: ['enrollmentStatus'],
      _count: { enrollmentStatus: true }
    })
    
    return Response.json({
      success: true,
      totalCount,
      students: allStudents,
      statusStats,
      enrollmentStats,
      message: `資料庫中共有 ${totalCount} 位學員`
    })
    
  } catch (error) {
    console.error('查詢學員數量失敗:', error)
    return Response.json(
      { error: '查詢失敗', details: error.message },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
