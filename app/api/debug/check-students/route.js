import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    console.log('開始檢查學員資料...')
    
    // 查詢所有學員（包括已歸檔的）
    const allStudents = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 查詢未歸檔的學員
    const activeStudents = await prisma.user.findMany({
      where: {
        archivedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 查詢已歸檔的學員
    const archivedStudents = await prisma.user.findMany({
      where: {
        archivedAt: {
          not: null
        }
      },
      orderBy: {
        archivedAt: 'desc'
      }
    })

    console.log('總學員數:', allStudents.length)
    console.log('活躍學員數:', activeStudents.length)
    console.log('已歸檔學員數:', archivedStudents.length)

    return Response.json({
      total: allStudents.length,
      active: activeStudents.length,
      archived: archivedStudents.length,
      allStudents: allStudents.map(student => ({
        id: student.id,
        name: student.name,
        course: student.course,
        paymentStatus: student.paymentStatus,
        refundStatus: student.refundStatus,
        archivedAt: student.archivedAt,
        createdAt: student.createdAt
      })),
      activeStudents: activeStudents.map(student => ({
        id: student.id,
        name: student.name,
        course: student.course,
        paymentStatus: student.paymentStatus,
        refundStatus: student.refundStatus,
        archivedAt: student.archivedAt,
        createdAt: student.createdAt
      })),
      archivedStudents: archivedStudents.map(student => ({
        id: student.id,
        name: student.name,
        course: student.course,
        paymentStatus: student.paymentStatus,
        refundStatus: student.refundStatus,
        archivedAt: student.archivedAt,
        createdAt: student.createdAt
      }))
    })
  } catch (error) {
    console.error('檢查學員資料時發生錯誤:', error)
    return Response.json(
      { error: '檢查學員資料失敗', details: error.message },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
