import { prisma } from '../../../lib/prisma'
import { performance } from '../../../lib/performance'
import { cache } from '../../../lib/cache'
import { logger } from '../../../lib/logger'

export async function GET() {
  const startTime = Date.now()
  
  try {
    // 並行檢查各個服務
    const checks = await Promise.allSettled([
      // 資料庫健康檢查
      checkDatabase(),
      // LINE API 健康檢查
      checkLineApi(),
      // 緩存健康檢查
      checkCache()
    ])

    const [dbCheck, lineCheck, cacheCheck] = checks.map(result => 
      result.status === 'fulfilled' ? result.value : { 
        status: 'error', 
        error: result.reason?.message || 'Unknown error' 
      }
    )

    // 整體健康狀態
    const allHealthy = [dbCheck, lineCheck, cacheCheck].every(check => check.status === 'healthy')
    
    const healthData = {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbCheck,
        lineApi: lineCheck,
        cache: cacheCheck
      },
      system: performance.getSystemMetrics(),
      uptime: Math.round(process.uptime()),
      responseTime: Date.now() - startTime
    }

    logger.info('Health check completed', {
      status: healthData.status,
      responseTime: healthData.responseTime
    })

    return Response.json(healthData, {
      status: allHealthy ? 200 : 503
    })
    
  } catch (error) {
    logger.error('Health check failed', error)
    
    return Response.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime: Date.now() - startTime
    }, { status: 500 })
  }
}

// 資料庫健康檢查
async function checkDatabase() {
  try {
    const start = Date.now()
    
    // 簡單查詢測試
    await prisma.$queryRaw`SELECT 1`
    
    // 獲取用戶數量
    const userCount = await prisma.user.count()
    
    const responseTime = Date.now() - start
    
    return {
      status: 'healthy',
      responseTime,
      details: {
        userCount,
        connectionPool: 'active'
      }
    }
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      details: {
        type: 'database_connection_failed'
      }
    }
  }
}

// LINE API 健康檢查
async function checkLineApi() {
  try {
    // 檢查環境變數
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      return {
        status: 'error',
        error: 'LINE_CHANNEL_ACCESS_TOKEN not configured'
      }
    }

    return {
      status: 'healthy',
      details: {
        tokenConfigured: true,
        tokenLength: process.env.LINE_CHANNEL_ACCESS_TOKEN.length
      }
    }
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    }
  }
}

// 緩存健康檢查
async function checkCache() {
  try {
    const testKey = 'health_check_test'
    const testValue = Date.now().toString()
    
    // 測試設置和獲取
    cache.set(testKey, testValue, 1000)
    const retrieved = cache.get(testKey)
    cache.delete(testKey)
    
    const isWorking = retrieved === testValue
    
    return {
      status: isWorking ? 'healthy' : 'error',
      details: {
        size: cache.size(),
        testPassed: isWorking
      }
    }
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    }
  }
}
