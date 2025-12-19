'use client';

import Image from 'next/image';
import FadeIn from './FadeIn';

export default function InstructorSection() {
  return (
    <section id="instructor" className="bg-retro-dark py-32 relative overflow-hidden">
      {/* Decorative Film Strip Pattern */}
      <div className="absolute top-0 left-0 w-full h-8 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(225,151,76,0.05)_20px,rgba(225,151,76,0.05)_40px)] opacity-30"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-24 items-center">
          <FadeIn delay={0.2} direction="right">
            <div className="relative group max-w-md mx-auto">
              <div className="absolute -inset-4 border border-retro-amber/20 translate-x-4 translate-y-4 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-700"></div>
              <div className="relative aspect-[4/5] bg-retro-wood overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000 border border-retro-amber/10">
                <Image
                  src="https://placehold.co/800x1000/1a120b/e1974c?text=Musical+Soul"
                  alt="講師照片"
                  width={800}
                  height={1000}
                  className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-[2s]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-retro-dark via-transparent to-transparent opacity-60"></div>
              </div>
              <div className="absolute -bottom-6 -left-6 font-playfair italic text-retro-amber/20 text-8xl font-black select-none pointer-events-none">SOUL</div>
            </div>
          </FadeIn>

          <FadeIn delay={0.4} direction="left">
            <div className="text-left space-y-8">
              <div>
                <span className="font-playfair italic text-retro-amber uppercase tracking-[0.4em] text-xs mb-4 block">The Guide</span>
                <h2 className="text-5xl md:text-7xl font-playfair font-black text-retro-cream mb-6 leading-[0.8] tracking-tighter">
                  關於 <br />
                  <span className="text-retro-amber italic">領路人</span>
                </h2>
              </div>

              <div className="space-y-6 font-serif text-retro-cream/60 text-lg leading-relaxed italic">
                <p>
                  音樂不只是一個聲音，它是靈魂的脈動。在十餘年投身於吉他彈奏與流行音樂創作的過程中，我始終在尋找那種能讓人屏息的「真實感」。
                </p>
                <p>
                  教學對我而言，是一場與另一顆靈魂共同探索的沙龍。我們將在這裡，在撥動琴弦的瞬間，找回對音樂最純粹的熱愛與情調。
                </p>
              </div>

              <div className="flex items-center gap-10 pt-4">
                {['Youtube', 'Instagram', 'Spotify'].map((social) => (
                  <a key={social} href="#" className="font-playfair text-[10px] uppercase tracking-[0.4em] text-retro-amber/40 hover:text-retro-amber transition-colors">
                    {social}
                  </a>
                ))}
              </div>

              <div className="w-16 h-[1px] bg-retro-amber/20"></div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
