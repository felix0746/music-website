'use client';

import { useState } from 'react';
import FadeIn from './FadeIn';

const faqs = [
  { question: "上課前需要有什麼音樂基礎嗎？", answer: "完全不需要。我的教學理念是協助每顆靈魂找到表達的路徑。無論您是初次觸碰琴弦，還是希望在創作中尋求突破，我們都會在沙龍中找到屬於您的節奏。" },
  { question: "我需要自己準備吉他或樂器嗎？", answer: "建議擁有自己的樂器，那是您最私密的創作夥伴。如果您在挑選上需要建議，我會從專業角度為您分析每一把琴的情調與性格。" },
  { question: "課程安排是否具備彈性？", answer: "創作是需要呼吸空間的。我們的課程採錄影與即時對話並行的模式，讓您在深夜靈感進發時能隨時複習，在瓶頸時能透過對話找到出口。" },
  { question: "退費政策是如何運作的？", answer: "我們珍視每一次音樂的緣分。若您的旅程需暫時停歇，請於開課前諮詢，我們將以最體面的方式協助您辦理相關手續。" }
];

export default function FaqSection() {
  const [openItems, setOpenItems] = useState(new Set());

  const toggleItem = (index) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <section id="faq" className="bg-retro-dark py-32 relative overflow-hidden">
      {/* Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/p6-dark.png')]"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <FadeIn>
          <div className="mb-24 text-left border-l-2 border-retro-amber/20 pl-8">
            <span className="font-playfair italic text-retro-amber uppercase tracking-[0.4em] text-xs mb-4 block">Knowledge Base</span>
            <h2 className="text-5xl md:text-7xl font-playfair font-black text-retro-cream leading-tight">
              解惑 <span className="text-retro-amber italic">沙龍</span>
            </h2>
          </div>
        </FadeIn>

        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <FadeIn key={index} delay={index * 0.1}>
                <div className={`overflow-hidden transition-all duration-700 border border-retro-amber/10 ${openItems.has(index) ? 'bg-retro-wood/10 border-retro-amber/30' : 'bg-transparent hover:border-retro-amber/20'}`}>
                  <button
                    className="w-full py-8 px-8 text-left group focus:outline-none flex justify-between items-center"
                    onClick={() => toggleItem(index)}
                  >
                    <span className={`font-serif text-xl sm:text-2xl italic tracking-wide transition-colors duration-500 ${openItems.has(index) ? 'text-retro-amber' : 'text-retro-cream/60 group-hover:text-retro-cream'}`}>
                      {faq.question}
                    </span>
                    <div className={`relative w-4 h-4 transform transition-transform duration-700 ${openItems.has(index) ? 'rotate-45' : ''}`}>
                      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-retro-amber"></div>
                      <div className="absolute top-0 left-1/2 w-[1px] h-full bg-retro-amber"></div>
                    </div>
                  </button>

                  <div className={`transition-all duration-700 ease-in-out overflow-hidden ${openItems.has(index) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-8 pb-10">
                      <p className="font-serif text-retro-cream/40 text-lg leading-relaxed italic max-w-2xl border-t border-retro-amber/5 pt-8">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
