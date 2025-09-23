import NextAuth from "next-auth"
import LineProvider from "next-auth/providers/line"
import { Client } from '@line/bot-sdk'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID,
      clientSecret: process.env.LINE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.id = profile.sub
      }
      return token
    },
    async session({ session, token }) {
      session.userId = token.id
      return session
    },
  },
  events: {
    async signIn({ account, profile }) {
      if (account.provider === 'line') {
        const lineUserId = profile.sub;
        const userName = profile.name;

        if (!lineUserId) {
          console.error("無法從 LINE profile 獲取 User ID");
          return;
        }

        try {
          // 登入時，先查詢資料庫
          const existingUser = await prisma.user.findUnique({
            where: { lineUserId: lineUserId },
          });
          
          // 如果用戶不存在，創建基本記錄（但不發送付款資訊）
          if (!existingUser) {
            console.log(`新用戶登入: ${userName}。創建基本記錄...`);

            await prisma.user.create({
              data: {
                lineUserId: lineUserId,
                name: userName,
                welcomeMessageSent: false, // 不自動發送歡迎訊息
                isVerified: false, // 需要透過 webhook 驗證
              },
            });

            console.log(`已將 ${userName} 的基本記錄存入資料庫。`);
          } else {
            console.log(`老朋友回來了: ${userName}。`);
          }
        } catch (error) {
          console.error("處理 signIn 事件時發生錯誤:", error);
        }
      }
    }
  }
})

export const { GET, POST } = handlers