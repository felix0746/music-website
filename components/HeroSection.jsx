'use client';

import Link from 'next/link';
import FadeIn from './FadeIn';
import { motion } from 'framer-motion';

export default function HeroSection() {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden bg-retro-dark">
      {/* Film Grain Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-20 bg-[url('https://www.transparenttextures.com/patterns/p6-dark.png')]"></div>

      {/* Dynamic Warm Ambient Light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] bg-[radial-gradient(circle,rgba(225,151,76,0.08)_0%,transparent_60%)] pointer-events-none"></div>

      {/* Decorative Vinyl Record Shape */}
      <div className="absolute -right-64 top-1/2 -translate-y-1/2 w-[600px] h-[600px] border-[40px] border-retro-wood/10 rounded-full hidden xl:block opacity-20"></div>

      {/* Content */}
      <div className="relative z-30 text-center px-6 max-w-5xl mx-auto">
        <FadeIn delay={0.2}>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-8 bg-retro-amber/40"></div>
            <span className="font-playfair italic text-retro-amber uppercase tracking-[0.4em] text-xs">
              Vintage Soul & Modern Sound
            </span>
            <div className="h-px w-8 bg-retro-amber/40"></div>
          </div>
        </FadeIn>

        <FadeIn delay={0.4}>
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-playfair font-black text-retro-cream mb-8 leading-[0.9] tracking-tighter">
            找回您的<br />
            <span className="italic text-retro-amber">音樂靈魂</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.6}>
          <p className="text-xl md:text-2xl text-retro-cream/60 mb-12 max-w-2xl mx-auto leading-relaxed font-serif italic">
            從吉他的第一聲共鳴到流行創作的靈感迸發。<br className="hidden sm:block" />
            在這裡，音樂不只是技巧，更是一場歲月沉澱的情調。
          </p>
        </FadeIn>

        <FadeIn delay={0.8}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <a
              href="#courses"
              className="px-12 py-5 bg-retro-amber text-retro-dark font-playfair font-bold uppercase tracking-widest text-sm transition-all duration-500 shadow-[8px_8px_0px_rgba(60,42,33,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
            >
              進入創作沙龍
            </a>

            <Link
              href="#instructor"
              className="group flex items-center gap-3 font-playfair text-retro-cream/80 hover:text-retro-amber transition-colors duration-300 tracking-widest text-sm uppercase"
            >
              遇見吉他領路人
              <span className="w-8 h-px bg-retro-amber/40 group-hover:w-12 transition-all duration-300"></span>
            </Link>
          </div>
        </FadeIn>
      </div>

      {/* Styled Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-30 flex flex-col items-center gap-4">
        <div className="w-6 h-10 border-2 border-retro-amber/20 rounded-full flex justify-center p-1">
          <motion.div
            animate={{ y: [0, 16, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-1.5 h-1.5 bg-retro-amber rounded-full"
          />
        </div>
      </div>
    </section>
  );
}
