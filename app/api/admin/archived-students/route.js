import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 50
    const skip = (page - 1) * limit

    // 查詢已歸檔的學員
    const [students, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: {
          archivedAt: {
            not: null  // 只查詢已歸檔的學員
          }
        },
        orderBy: {
          archivedAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.user.count({
        where: {
          archivedAt: {
            not: null
          }
        }
      })
    ])

    return Response.json({
      students,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    console.error('獲取歸檔學員資料時發生錯誤:', error)
    return Response.json({ 
      error: '獲取歸檔學員資料時發生錯誤',
      details: error.message 
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
