'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['courses', 'instructor', 'testimonials', 'faq', 'enroll'];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* 桌面版固定側邊導覽 - 復古垂直樣式優化 */}
      <nav className="hidden lg:block fixed left-10 top-1/2 transform -translate-y-1/2 z-50">
        <div className="flex flex-col items-center space-y-12">
          {[
            { id: 'courses', label: '沙龍課程' },
            { id: 'instructor', label: '導師簡介' },
            { id: 'testimonials', label: '學員共鳴' },
            { id: 'faq', label: '常見疑問' },
            { id: 'enroll', label: '預約啟程' }
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="group relative flex items-center justify-center py-2"
              title={item.label}
            >
              {/* 導覽線條 */}
              <div className={`w-[3px] transition-all duration-700 rounded-full ${activeSection === item.id ? 'h-10 bg-retro-amber shadow-[0_0_20px_rgba(225,151,76,0.5)]' : 'h-6 bg-retro-cream/20 group-hover:bg-retro-amber/50'
                }`} />

              {/* 標籤文字 */}
              <span className={`absolute left-10 font-serif italic text-sm tracking-[0.2em] transition-all duration-500 whitespace-nowrap ${activeSection === item.id ? 'opacity-100 translate-x-0 text-retro-amber font-bold' : 'opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 text-retro-cream/40'
                }`}>
                {item.label}
              </span>
            </a>
          ))}
        </div>
      </nav>

      {/* 手機版頂部 Logo - 復古情調化 */}
      <div className="lg:hidden bg-retro-dark/95 backdrop-blur-xl sticky top-0 z-40 border-b border-retro-amber/10">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-center items-center">
            <a href="/" className="font-playfair text-2xl tracking-[0.3em] text-retro-cream">
              SOUL <span className="text-retro-amber italic text-lg ml-1">Notes</span>
            </a>
          </div>
        </div>
      </div>

      {/* 手機版底部固定導覽 - 精緻復古 */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-retro-dark/95 backdrop-blur-xl border-t border-retro-amber/10 z-50 pb-safe">
        <div className="grid grid-cols-5 h-16">
          {[
            { id: 'courses', label: '沙龍', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { id: 'instructor', label: '導師', icon: 'M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z' },
            { id: 'testimonials', label: '共鳴', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
            { id: 'faq', label: '解惑', icon: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z' },
            { id: 'enroll', label: '啟程', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`flex flex-col items-center justify-center transition-all duration-500 ${activeSection === item.id ? 'text-retro-amber scale-110' : 'text-retro-cream/30'
                }`}
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className="text-[9px] font-serif uppercase tracking-widest">{item.label}</span>
            </a>
          ))}
        </div>
      </nav>
    </>
  );
}
