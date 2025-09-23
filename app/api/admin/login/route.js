import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// 管理員帳號密碼設定
const ADMIN_USERNAME = 'lulu'
const ADMIN_PASSWORD = 'lulu1110'

export async function POST(request) {
  try {
    const { username, password } = await request.json()

    // 驗證帳號密碼
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // 建立認證 cookie
      const response = NextResponse.json({ success: true })
      response.cookies.set('admin-auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 // 24 小時
      })
      
      return response
    } else {
      return NextResponse.json(
        { error: '帳號或密碼錯誤' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('登入時發生錯誤:', error)
    return NextResponse.json(
      { error: '登入失敗' },
      { status: 500 }
    )
  }
}
