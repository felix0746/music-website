import type { Metadata } from "next";
import { Noto_Serif_TC, Playfair_Display, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import SessionProvider from "../components/SessionProvider";

const notoSerifTC = Noto_Serif_TC({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-noto-serif",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  title: "靈魂樂章 | 現代音樂與吉他創作教室",
  description: "吉他、流行音樂創作與歌唱技巧課，找回屬於您的音樂靈魂",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body
        className={`${notoSerifTC.variable} ${playfairDisplay.variable} ${cormorantGaramond.variable} font-serif antialiased bg-[#1A120B] text-[#F5E8C7]`}
      >
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
