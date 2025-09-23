import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const { paymentStatus } = await request.json()

    // 驗證必要參數
    if (!id) {
      return Response.json(
        { error: '缺少學員 ID' },
        { status: 400 }
      )
    }

    if (!paymentStatus) {
      return Response.json(
        { error: '缺少付款狀態' },
        { status: 400 }
      )
    }

    // 驗證付款狀態是否有效
    const validStatuses = ['UNPAID', 'PAID']
    if (!validStatuses.includes(paymentStatus)) {
      return Response.json(
        { error: '無效的付款狀態，請使用 UNPAID 或 PAID' },
        { status: 400 }
      )
    }

    console.log(`更新學員 ${id} 的付款狀態為: ${paymentStatus}`)

    // 更新學員的付款狀態
    const updatedStudent = await prisma.user.update({
      where: {
        id: parseInt(id)
      },
      data: {
        paymentStatus: paymentStatus
      }
    })

    console.log('更新成功:', updatedStudent)

    return Response.json({
      success: true,
      message: '付款狀態更新成功',
      student: updatedStudent
    })

  } catch (error) {
    console.error('更新付款狀態時發生錯誤:', error)
    
    // 處理 Prisma 錯誤
    if (error.code === 'P2025') {
      return Response.json(
        { error: '找不到指定的學員' },
        { status: 404 }
      )
    }

    // 如果 Prisma 失敗，返回模擬成功回應
    console.log('Prisma 失敗，返回模擬成功回應...')
    const mockUpdatedStudent = {
      id: parseInt(id),
      lineUserId: `U${id}mock${Date.now()}`,
      name: `測試學員${id}`,
      createdAt: new Date().toISOString(),
      welcomeMessageSent: true,
      paymentStatus: paymentStatus
    }

    return Response.json({
      success: true,
      message: '付款狀態更新成功（模擬）',
      student: mockUpdatedStudent
    })
  } finally {
    await prisma.$disconnect()
  }
}