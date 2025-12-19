import { PrismaClient } from '@prisma/client'

let prisma

function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

export async function PATCH(request, { params }) {
  try {
    // Next.js 16+ 中 params 是 Promise，需要 await
    const { id } = await params
    const updateData = await request.json()

    // 驗證必要參數
    if (!id) {
      return Response.json(
        { error: '缺少學員 ID' },
        { status: 400 }
      )
    }

    // 構建更新資料
    const dataToUpdate = {}
    
    // 處理付款狀態更新
    if (updateData.paymentStatus) {
      const validPaymentStatuses = ['UNPAID', 'PAID', 'PARTIAL', 'PENDING']
      if (!validPaymentStatuses.includes(updateData.paymentStatus)) {
        return Response.json(
          { error: '無效的付款狀態，請使用 UNPAID、PAID、PARTIAL 或 PENDING' },
          { status: 400 }
        )
      }
      dataToUpdate.paymentStatus = updateData.paymentStatus
    }

    // 處理報名狀態更新
    if (updateData.enrollmentStatus) {
      const validEnrollmentStatuses = ['ACTIVE', 'CANCELLED', 'COMPLETED']
      if (!validEnrollmentStatuses.includes(updateData.enrollmentStatus)) {
        return Response.json(
          { error: '無效的報名狀態，請使用 ACTIVE、CANCELLED 或 COMPLETED' },
          { status: 400 }
        )
      }
      dataToUpdate.enrollmentStatus = updateData.enrollmentStatus
    }

    // 處理取消相關欄位
    if (updateData.cancellationDate !== undefined) {
      dataToUpdate.cancellationDate = updateData.cancellationDate
    }
    if (updateData.cancellationReason !== undefined) {
      dataToUpdate.cancellationReason = updateData.cancellationReason
    }

    // 處理退款狀態更新
    if (updateData.refundStatus) {
      const validRefundStatuses = ['NONE', 'PENDING', 'COMPLETED', 'REJECTED']
      if (!validRefundStatuses.includes(updateData.refundStatus)) {
        return Response.json(
          { error: '無效的退款狀態' },
          { status: 400 }
        )
      }
      dataToUpdate.refundStatus = updateData.refundStatus
    }

    if (updateData.refundAmount !== undefined) {
      dataToUpdate.refundAmount = updateData.refundAmount
    }

    if (updateData.refundDate !== undefined) {
      dataToUpdate.refundDate = updateData.refundDate
    }

    console.log(`更新學員 ${id} 的資料:`, dataToUpdate)

    const prismaInstance = getPrisma()
    
    // 更新學員資料
    const updatedStudent = await prismaInstance.user.update({
      where: {
        id: parseInt(id)
      },
      data: dataToUpdate
    })

    console.log('更新成功:', updatedStudent)

    return Response.json({
      success: true,
      message: '學員資料更新成功',
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

    // 返回詳細錯誤訊息
    return Response.json({ 
      error: '更新學員資料失敗',
      details: error.message || '未知錯誤',
      hint: '請檢查：1. 學員 ID 是否正確 2. 資料格式是否正確 3. 資料庫連接是否正常'
    }, { status: 500 })
  } finally {
    const prismaInstance = getPrisma()
    await prismaInstance.$disconnect()
  }
}