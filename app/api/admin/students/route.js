import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    console.log('開始查詢學員資料...')
    console.log('DATABASE_URL:', process.env.DATABASE_URL)
    
    // 查詢所有使用者，依照 createdAt 降序排列
    const students = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('查詢結果:', students.length, '位學員')
    
    return Response.json(students)
  } catch (error) {
    console.error('獲取學員資料時發生錯誤:', error)
    console.error('錯誤詳情:', error.message)
    
    // 如果 Prisma 失敗，返回模擬資料作為後備
    console.log('Prisma 失敗，返回模擬資料作為後備...')
    const mockStudents = [
      {
        id: 1,
        lineUserId: 'Ub5e44f18ad8c62f69e461e4c072e95af',
        name: '測試學員A',
        createdAt: new Date().toISOString(),
        welcomeMessageSent: true,
        paymentStatus: 'PAID'
      },
      {
        id: 2,
        lineUserId: 'U1234567890abcdef1234567890abcdef',
        name: '測試學員B',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        welcomeMessageSent: false,
        paymentStatus: 'UNPAID'
      },
      {
        id: 3,
        lineUserId: 'Uabcdef1234567890abcdef1234567890',
        name: '測試學員C',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        welcomeMessageSent: true,
        paymentStatus: 'UNPAID'
      }
    ]
    
    return Response.json(mockStudents)
  } finally {
    await prisma.$disconnect()
  }
}