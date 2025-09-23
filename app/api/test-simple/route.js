import { prisma } from '../../lib/prisma'

export async function GET() {
  try {
    // 測試 Prisma 連接
    const userCount = await prisma.user.count()
    
    return Response.json({
      success: true,
      message: 'Prisma 連接正常',
      userCount: userCount
    })
  } catch (error) {
    console.error('Prisma 測試錯誤:', error)
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
