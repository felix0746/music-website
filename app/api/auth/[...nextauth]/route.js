import NextAuth from "next-auth"
import LineProvider from "next-auth/providers/line"
import { Client } from '@line/bot-sdk'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

export const authOptions = {
  providers: [
    LineProvider({
      clientId: process.env.LINE_CHANNEL_ID,
      clientSecret: process.env.LINE_CHANNEL_SECRET,
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
    async signIn({ user, account, profile }) {
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
                 
                 // 判斷是否為新用戶
                 if (!existingUser) {
                   console.log(`新用戶報名: ${userName}。準備發送歡迎訊息...`);

                   // 建立並發送歡迎訊息
                   const message = {
                     type: 'text',
                     text: `嗨 ${userName}！👋\n\n感謝您首次報名我們的音樂課程！以下是課程的付款資訊：\n\n銀行：[您的銀行名稱] (XXX)\n帳號：[您的銀行帳號]\n戶名：[您的戶名]\n\n完成匯款後，請直接在此聊天室回覆您的「姓名」與「帳號後五碼」，我們會盡快為您確認！😊`,
                   };
                   await lineClient.pushMessage(lineUserId, message);
                   
                   // 將新用戶資料寫入資料庫，並標記為已發送
                   await prisma.user.create({
                     data: {
                       lineUserId: lineUserId,
                       name: userName,
                       welcomeMessageSent: true,
                     },
                   });

                   console.log(`已成功發送歡迎訊息並將 ${userName} 存入資料庫。`);

                 } else {
                   console.log(`老朋友回來了: ${userName}。跳過歡迎訊息。`);
                 }
               } catch (error) {
                 console.error("處理 signIn 事件時發生錯誤:", error);
               }
      }
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }