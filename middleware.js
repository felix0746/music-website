import { NextResponse } from 'next/server'

export function middleware(request) {
  // 檢查是否為 /admin 路徑，但排除 /admin/login
  if (request.nextUrl.pathname.startsWith('/admin') && request.nextUrl.pathname !== '/admin/login') {
    // 檢查是否有認證 cookie
    const authCookie = request.cookies.get('admin-auth')
    
    if (!authCookie || authCookie.value !== 'authenticated') {
      // 如果沒有認證，重定向到登入頁面
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin',
    '/admin/((?!login).)*'
  ]
}
