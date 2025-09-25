import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

// 優化的 Prisma 配置
export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // 連接池配置
  connectionLimit: 10,
  poolTimeout: 10000,
  // 查詢優化
  transactionOptions: {
    maxWait: 5000, // 最大等待時間
    timeout: 10000, // 事務超時時間
  },
})

// 優雅關閉連接
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
