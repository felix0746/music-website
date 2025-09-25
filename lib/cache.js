// 簡單的記憶體緩存機制
class SimpleCache {
  constructor() {
    this.cache = new Map()
    this.ttl = new Map() // Time To Live
  }

  // 設置緩存
  set(key, value, ttlMs = 300000) { // 默認5分鐘
    this.cache.set(key, value)
    this.ttl.set(key, Date.now() + ttlMs)
  }

  // 獲取緩存
  get(key) {
    // 檢查是否過期
    const expireTime = this.ttl.get(key)
    if (expireTime && Date.now() > expireTime) {
      this.cache.delete(key)
      this.ttl.delete(key)
      return null
    }
    
    return this.cache.get(key) || null
  }

  // 刪除緩存
  delete(key) {
    this.cache.delete(key)
    this.ttl.delete(key)
  }

  // 清空所有緩存
  clear() {
    this.cache.clear()
    this.ttl.clear()
  }

  // 獲取緩存大小
  size() {
    return this.cache.size
  }

  // 清理過期的緩存
  cleanup() {
    const now = Date.now()
    for (const [key, expireTime] of this.ttl.entries()) {
      if (now > expireTime) {
        this.cache.delete(key)
        this.ttl.delete(key)
      }
    }
  }
}

// 創建全局緩存實例
export const cache = new SimpleCache()

// 定期清理過期緩存（每5分鐘）
if (typeof window === 'undefined') {
  setInterval(() => {
    cache.cleanup()
  }, 300000)
}

// 緩存裝飾器函數
export function withCache(key, ttlMs = 300000) {
  return function(target, propertyName, descriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function(...args) {
      const cacheKey = `${key}_${JSON.stringify(args)}`
      
      // 嘗試從緩存獲取
      const cached = cache.get(cacheKey)
      if (cached !== null) {
        return cached
      }

      // 執行原始方法
      const result = await originalMethod.apply(this, args)
      
      // 存入緩存
      cache.set(cacheKey, result, ttlMs)
      
      return result
    }

    return descriptor
  }
}

// 緩存助手函數
export async function getCachedData(key, fetchFunction, ttlMs = 300000) {
  // 嘗試從緩存獲取
  const cached = cache.get(key)
  if (cached !== null) {
    return cached
  }

  // 執行獲取函數
  const data = await fetchFunction()
  
  // 存入緩存
  cache.set(key, data, ttlMs)
  
  return data
}
