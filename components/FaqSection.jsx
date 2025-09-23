'use client';

import { useState } from 'react';
import FadeIn from './FadeIn';

const faqs = [
    { question: "上課前需要有什麼音樂基礎嗎？", answer: "完全不需要！我的課程設計涵蓋了從零基礎到進階的內容，無論你是剛接觸音樂的新手，還是希望突破瓶頸的進階者，都能找到適合自己的學習路徑。" },
    { question: "我需要自己準備樂器嗎？", answer: "是的，建議您自備樂器（例如吉他）以便課後練習。如果您在挑選樂器上有任何問題，我很樂意提供建議！" },
    { question: "課程是直播還是預錄影片？如果錯過了怎麼辦？", answer: "課程主要以高品質的預錄影片為主，讓您可以彈性安排時間、無限次重複觀看。此外，我會定期舉辦直播問答，解決大家在學習上遇到的問題。" },
    { question: "付款後如果臨時有事，可以退費嗎？", answer: "這是一個退費政策的佔位符回答。請在此處詳細說明您的退費條款，例如開課前 N 天可全額退款，開課後則無法退款等，以保障雙方權益。" }
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
    <section id="faq" className="bg-slate-50 py-16 sm:py-16 md:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-6 sm:px-6 lg:ml-20 lg:mr-20">
        <FadeIn>
          <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-3xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-4 sm:mb-4">還有問題嗎？</h2>
              <p className="text-lg sm:text-lg leading-6 sm:leading-8 text-slate-600">這裡整理了一些常見問題，希望能為你解惑。</p>
          </div>
        </FadeIn>
        <div className="mt-8 sm:mt-12">
            <div className="w-full space-y-4 max-w-3xl mx-auto">
                {faqs.map((faq, index) => (
                    <FadeIn key={index} delay={index * 0.1}>
                      <div className="border border-slate-200 rounded-lg">
                        <button
                            className="w-full px-6 sm:px-6 py-4 sm:py-4 text-left text-lg sm:text-base md:text-lg font-medium text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset transition-colors min-h-[64px] flex items-center"
                            onClick={() => toggleItem(index)}
                        >
                            <div className="flex justify-between items-center">
                                <span className="pr-2">{faq.question}</span>
                                <svg
                                    className={`w-6 h-6 sm:w-5 sm:h-5 transform transition-transform duration-200 flex-shrink-0 ${
                                        openItems.has(index) ? 'rotate-180' : ''
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </button>
                        {openItems.has(index) && (
                            <div className="px-4 sm:px-6 pb-3 sm:pb-4">
                                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{faq.answer}</p>
                            </div>
                        )}
                      </div>
                    </FadeIn>
                ))}
            </div>
        </div>
      </div>
    </section>
  );
}
