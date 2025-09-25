// 結構化日誌系統
class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  // 格式化日誌訊息
  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString()
    const logData = {
      timestamp,
      level,
      message,
      ...context
    }

    if (this.isDevelopment) {
      // 開發環境：美化輸出
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`)
      if (Object.keys(context).length > 0) {
        console.log('Context:', context)
      }
    } else {
      // 生產環境：JSON 格式
      console.log(JSON.stringify(logData))
    }

    return logData
  }

  // 信息日誌
  info(message, context = {}) {
    return this.formatMessage('info', message, context)
  }

  // 錯誤日誌
  error(message, error = null, context = {}) {
    const errorContext = {
      ...context,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      })
    }
    return this.formatMessage('error', message, errorContext)
  }

  // 警告日誌
  warn(message, context = {}) {
    return this.formatMessage('warn', message, context)
  }

  // 調試日誌
  debug(message, context = {}) {
    if (this.isDevelopment) {
      return this.formatMessage('debug', message, context)
    }
  }

  // API 請求日誌
  apiRequest(method, url, context = {}) {
    return this.info(`${method} ${url}`, {
      type: 'api_request',
      method,
      url,
      ...context
    })
  }

  // API 響應日誌
  apiResponse(method, url, status, duration, context = {}) {
    const level = status >= 400 ? 'error' : 'info'
    return this.formatMessage(level, `${method} ${url} - ${status}`, {
      type: 'api_response',
      method,
      url,
      status,
      duration,
      ...context
    })
  }

  // 資料庫操作日誌
  database(operation, table, context = {}) {
    return this.debug(`DB ${operation} on ${table}`, {
      type: 'database',
      operation,
      table,
      ...context
    })
  }

  // LINE API 操作日誌
  lineApi(action, context = {}) {
    return this.info(`LINE API: ${action}`, {
      type: 'line_api',
      action,
      ...context
    })
  }
}

export const logger = new Logger()
