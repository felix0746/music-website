'use client';

import FadeIn from './FadeIn';

export default function EnrollmentSection() {
  return (
    <section id="enroll" className="bg-retro-dark py-32 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-retro-amber/5 rounded-full pointer-events-none animate-pulse"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <FadeIn>
          <div className="text-center mb-24">
            <span className="font-playfair italic text-retro-amber uppercase tracking-[0.4em] text-xs mb-4 block">Begin Your Journey</span>
            <h2 className="text-5xl md:text-7xl font-playfair font-black text-retro-cream leading-tight mb-8">
              現在就啟程，找回 <br />
              <span className="text-retro-amber italic">音樂的純粹</span>
            </h2>
            <p className="font-serif italic text-retro-cream/40 max-w-2xl mx-auto text-xl leading-relaxed">
              透過 LINE 官方帳號開啟專屬您的私人對話，讓我們為您的創作與歌聲引領方向。
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="max-w-3xl mx-auto bg-retro-wood/5 border border-retro-amber/10 p-16 md:p-24 text-center group hover:border-retro-amber/30 transition-all duration-700">
            <div className="space-y-12">
              <div className="space-y-4">
                <h3 className="text-3xl font-playfair font-bold text-retro-cream tracking-widest uppercase">
                  透過 LINE 預約啟程
                </h3>
                <p className="text-retro-cream/30 font-serif italic text-lg leading-relaxed">
                  加入我們的官方帳號，獲取課程詳情與一對一諮詢。
                </p>
              </div>

              <a
                href="https://line.me/R/ti/p/@363nnttn"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-retro-amber text-retro-dark font-playfair font-bold uppercase tracking-[0.2em] py-6 px-16 transition-all duration-500 text-lg shadow-[10px_10px_0px_rgba(60,42,33,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none hover:bg-retro-cream"
              >
                啟程對話
              </a>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-8 opacity-40">
                {['一對一諮詢', '創作沙龍', '現場演示'].map((text) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-retro-amber"></div>
                    <span className="font-playfair italic text-xs text-retro-cream tracking-widest uppercase">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.4}>
          <div className="mt-32 text-center max-w-4xl mx-auto space-y-12 border-t border-retro-amber/10 pt-24">
            <h3 className="font-playfair italic text-retro-amber tracking-[0.4em] text-sm uppercase">入學儀式</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mt-12">
              {[
                { step: '01', title: '加入 LINE', desc: '開啟屬於您的學習頻道' },
                { step: '02', title: '深度諮詢', desc: '確認您的創作與學習方向' },
                { step: '03', title: '契合方案', desc: '選擇最適合您的沙龍計畫' },
                { step: '04', title: '正式啟幕', desc: '開始您的靈魂探索之旅' }
              ].map((item) => (
                <div key={item.step} className="space-y-4">
                  <div className="font-playfair font-black text-retro-amber/10 text-6xl italic leading-none">{item.step}</div>
                  <div className="font-playfair font-bold text-retro-cream text-sm tracking-widest uppercase">{item.title}</div>
                  <div className="font-serif italic text-retro-cream/20 text-xs tracking-tight">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}