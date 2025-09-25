import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    console.log('開始查詢學員資料...')
    
    // 簡化版本 - 查詢所有使用者，依照 createdAt 降序排列
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
    
    return Response.json(
      { error: '資料庫連接失敗', details: error.message },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}