// 性能監控工具
import { logger } from './logger'

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map()
  }

  // 開始計時
  start(name) {
    this.metrics.set(name, {
      start: Date.now(),
      memory: process.memoryUsage()
    })
  }

  // 結束計時並記錄
  end(name, context = {}) {
    const metric = this.metrics.get(name)
    if (!metric) {
      logger.warn(`Performance metric '${name}' not found`)
      return null
    }

    const duration = Date.now() - metric.start
    const memoryAfter = process.memoryUsage()
    const memoryDiff = {
      heapUsed: memoryAfter.heapUsed - metric.memory.heapUsed,
      heapTotal: memoryAfter.heapTotal - metric.memory.heapTotal,
      external: memoryAfter.external - metric.memory.external
    }

    const result = {
      name,
      duration,
      memoryDiff,
      ...context
    }

    // 記錄性能數據
    if (duration > 1000) { // 超過1秒的操作記錄為警告
      logger.warn(`Slow operation: ${name}`, result)
    } else {
      logger.info(`Performance: ${name}`, result)
    }

    this.metrics.delete(name)
    return result
  }

  // 測量函數執行時間
  async measure(name, fn, context = {}) {
    this.start(name)
    try {
      const result = await fn()
      this.end(name, context)
      return result
    } catch (error) {
      this.end(name, { ...context, error: error.message })
      throw error
    }
  }

  // 獲取系統資源使用情況
  getSystemMetrics() {
    const memory = process.memoryUsage()
    const uptime = process.uptime()
    
    return {
      memory: {
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + ' MB',
        external: Math.round(memory.external / 1024 / 1024) + ' MB',
        rss: Math.round(memory.rss / 1024 / 1024) + ' MB'
      },
      uptime: {
        seconds: Math.round(uptime),
        formatted: this.formatUptime(uptime)
      },
      activeMetrics: this.metrics.size
    }
  }

  // 格式化運行時間
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${secs}s`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }
}

export const performance = new PerformanceMonitor()

// 性能監控中間件
export function withPerformanceMonitoring(name) {
  return function(target, propertyName, descriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function(...args) {
      return await performance.measure(
        `${name}_${propertyName}`,
        () => originalMethod.apply(this, args),
        { args: args.length }
      )
    }

    return descriptor
  }
}

// API 性能監控包裝器
export function monitorApiPerformance(handler, name) {
  return async function(request, context) {
    const startTime = Date.now()
    const url = new URL(request.url)
    
    try {
      const response = await handler(request, context)
      const duration = Date.now() - startTime
      
      logger.apiResponse(
        request.method,
        url.pathname,
        response.status || 200,
        duration
      )
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      
      logger.apiResponse(
        request.method,
        url.pathname,
        500,
        duration,
        { error: error.message }
      )
      
      throw error
    }
  }
}
