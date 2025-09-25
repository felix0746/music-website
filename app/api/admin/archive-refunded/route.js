import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request) {
  try {
    // 計算30天前的日期
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // 查找30天前完成退款且未歸檔的學員
    const studentsToArchive = await prisma.user.findMany({
      where: {
        refundStatus: 'COMPLETED',
        refundDate: {
          lte: thirtyDaysAgo
        },
        archivedAt: null
      }
    })

    if (studentsToArchive.length === 0) {
      return Response.json({ 
        success: true, 
        message: '沒有需要歸檔的學員',
        archivedCount: 0 
      })
    }

    // 批量歸檔學員
    const archiveResult = await prisma.user.updateMany({
      where: {
        id: {
          in: studentsToArchive.map(student => student.id)
        }
      },
      data: {
        archivedAt: new Date(),
        archiveReason: '退款完成30天後自動歸檔'
      }
    })

    return Response.json({ 
      success: true, 
      message: `成功歸檔 ${archiveResult.count} 位學員`,
      archivedCount: archiveResult.count,
      archivedStudents: studentsToArchive.map(student => ({
        id: student.id,
        name: student.name,
        course: student.course,
        refundDate: student.refundDate
      }))
    })

  } catch (error) {
    console.error('歸檔學員時發生錯誤:', error)
    return Response.json({ 
      success: false, 
      error: '歸檔學員時發生錯誤' 
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// 手動歸檔特定學員
export async function PUT(request) {
  try {
    const { studentId, reason } = await request.json()

    if (!studentId) {
      return Response.json({ 
        success: false, 
        error: '缺少學員ID' 
      }, { status: 400 })
    }

    const student = await prisma.user.findUnique({
      where: { id: parseInt(studentId) }
    })

    if (!student) {
      return Response.json({ 
        success: false, 
        error: '找不到指定的學員' 
      }, { status: 404 })
    }

    if (student.archivedAt) {
      return Response.json({ 
        success: false, 
        error: '該學員已經被歸檔' 
      }, { status: 400 })
    }

    const updatedStudent = await prisma.user.update({
      where: { id: parseInt(studentId) },
      data: {
        archivedAt: new Date(),
        archiveReason: reason || '手動歸檔'
      }
    })

    return Response.json({ 
      success: true, 
      message: `學員 ${updatedStudent.name} 已成功歸檔`,
      student: {
        id: updatedStudent.id,
        name: updatedStudent.name,
        course: updatedStudent.course,
        archivedAt: updatedStudent.archivedAt
      }
    })

  } catch (error) {
    console.error('手動歸檔學員時發生錯誤:', error)
    return Response.json({ 
      success: false, 
      error: '歸檔學員時發生錯誤' 
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// 恢復已歸檔的學員
export async function DELETE(request) {
  try {
    const { studentId } = await request.json()

    if (!studentId) {
      return Response.json({ 
        success: false, 
        error: '缺少學員ID' 
      }, { status: 400 })
    }

    const student = await prisma.user.findUnique({
      where: { id: parseInt(studentId) }
    })

    if (!student) {
      return Response.json({ 
        success: false, 
        error: '找不到指定的學員' 
      }, { status: 404 })
    }

    if (!student.archivedAt) {
      return Response.json({ 
        success: false, 
        error: '該學員未被歸檔' 
      }, { status: 400 })
    }

    const updatedStudent = await prisma.user.update({
      where: { id: parseInt(studentId) },
      data: {
        archivedAt: null,
        archiveReason: null
      }
    })

    return Response.json({ 
      success: true, 
      message: `學員 ${updatedStudent.name} 已成功恢復`,
      student: {
        id: updatedStudent.id,
        name: updatedStudent.name,
        course: updatedStudent.course
      }
    })

  } catch (error) {
    console.error('恢復學員時發生錯誤:', error)
    return Response.json({ 
      success: false, 
      error: '恢復學員時發生錯誤' 
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
