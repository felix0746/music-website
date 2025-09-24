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
    const { operation, studentIds, filters, updateData } = await request.json()

    if (!operation) {
      return Response.json(
        { error: '缺少操作類型' },
        { status: 400 }
      )
    }

    const prismaInstance = getPrisma()
    let targetStudents = []

    // 獲取目標學員
    if (studentIds && studentIds.length > 0) {
      targetStudents = await prismaInstance.user.findMany({
        where: {
          id: { in: studentIds }
        }
      })
    } else if (filters) {
      const whereClause = {}
      
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

      targetStudents = await prismaInstance.user.findMany({
        where: whereClause
      })
    } else {
      return Response.json(
        { error: '缺少目標學員條件' },
        { status: 400 }
      )
    }

    if (targetStudents.length === 0) {
      return Response.json(
        { error: '沒有找到符合條件的學員' },
        { status: 404 }
      )
    }

    const results = []
    let successCount = 0
    let failCount = 0

    // 執行批量操作
    for (const student of targetStudents) {
      try {
        let updateResult = {}

        switch (operation) {
          case 'updatePaymentStatus':
            if (!updateData.paymentStatus) {
              throw new Error('缺少付款狀態')
            }
            updateResult = await prismaInstance.user.update({
              where: { id: student.id },
              data: { paymentStatus: updateData.paymentStatus }
            })
            break

          case 'updateEnrollmentStatus':
            if (!updateData.enrollmentStatus) {
              throw new Error('缺少報名狀態')
            }
            updateResult = await prismaInstance.user.update({
              where: { id: student.id },
              data: { enrollmentStatus: updateData.enrollmentStatus }
            })
            break

          case 'markAsPaid':
            updateResult = await prismaInstance.user.update({
              where: { id: student.id },
              data: { 
                paymentStatus: 'PAID',
                paymentDate: new Date()
              }
            })
            break

          case 'markAsUnpaid':
            updateResult = await prismaInstance.user.update({
              where: { id: student.id },
              data: { 
                paymentStatus: 'UNPAID',
                paymentDate: null
              }
            })
            break

          case 'cancelEnrollment':
            updateResult = await prismaInstance.user.update({
              where: { id: student.id },
              data: { 
                enrollmentStatus: 'CANCELLED',
                cancellationDate: new Date(),
                cancellationReason: updateData.reason || '管理員取消'
              }
            })
            break

          case 'restoreEnrollment':
            updateResult = await prismaInstance.user.update({
              where: { id: student.id },
              data: { 
                enrollmentStatus: 'ACTIVE',
                cancellationDate: null,
                cancellationReason: null
              }
            })
            break

          default:
            throw new Error('不支援的操作類型')
        }

        results.push({
          studentId: student.id,
          name: student.name,
          status: 'success',
          operation: operation
        })
        successCount++

      } catch (error) {
        console.error(`操作學員 ${student.name} 失敗:`, error)
        results.push({
          studentId: student.id,
          name: student.name,
          status: 'failed',
          operation: operation,
          error: error.message
        })
        failCount++
      }
    }

    return Response.json({
      success: true,
      message: `批量操作完成：成功 ${successCount} 個，失敗 ${failCount} 個`,
      summary: {
        operation: operation,
        total: targetStudents.length,
        success: successCount,
        failed: failCount
      },
      results: results
    })

  } catch (error) {
    console.error('批量操作失敗:', error)
    return Response.json(
      { error: '批量操作失敗: ' + error.message },
      { status: 500 }
    )
  }
}

// 獲取支援的批量操作類型
export async function GET() {
  try {
    const operations = [
      {
        id: 'updatePaymentStatus',
        name: '更新付款狀態',
        description: '批量更新學員的付款狀態',
        requiredFields: ['paymentStatus']
      },
      {
        id: 'updateEnrollmentStatus',
        name: '更新報名狀態',
        description: '批量更新學員的報名狀態',
        requiredFields: ['enrollmentStatus']
      },
      {
        id: 'markAsPaid',
        name: '標記為已付款',
        description: '批量標記學員為已付款狀態'
      },
      {
        id: 'markAsUnpaid',
        name: '標記為未付款',
        description: '批量標記學員為未付款狀態'
      },
      {
        id: 'cancelEnrollment',
        name: '取消報名',
        description: '批量取消學員報名',
        optionalFields: ['reason']
      },
      {
        id: 'restoreEnrollment',
        name: '恢復報名',
        description: '批量恢復學員報名狀態'
      }
    ]

    return Response.json({
      success: true,
      operations: operations
    })

  } catch (error) {
    console.error('獲取操作類型失敗:', error)
    return Response.json(
      { error: '獲取操作類型失敗' },
      { status: 500 }
    )
  }
}
