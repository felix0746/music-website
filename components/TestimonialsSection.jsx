'use client';

import FadeIn from './FadeIn';

const testimonials = [
  {
    id: 1,
    name: "Liam",
    course: "流行音樂創作",
    content: "老師不僅教我吉他技巧，更教會我如何誠實地面對自己的創作。在那樣的情調中，我找到了失落已久的靈感。",
  },
  {
    id: 2,
    name: "Sophie",
    course: "歌唱情感演繹",
    content: "復古的氛圍讓學習變得不再枯燥。每一次在錄音室裡的對話，都像是在上一場跨越時空的藝術課。",
  },
  {
    id: 3,
    name: "Ethan",
    course: "現代吉他演奏",
    content: "這是目前為止最能讓我靜下心來彈琴的地方。琥珀色的燈光下，指尖下的每一個音符都有了靈魂。",
  }
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="bg-retro-dark py-32 relative overflow-hidden">
      {/* Background Ambience / Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vw] bg-[radial-gradient(circle,rgba(225,151,76,0.03)_0%,transparent_70%)] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <FadeIn>
          <div className="text-center mb-24">
            <span className="font-playfair italic text-retro-amber uppercase tracking-[0.4em] text-xs mb-4 block">Echoes of Soul</span>
            <h2 className="text-5xl md:text-7xl font-playfair font-black text-retro-cream leading-tight">
              學員 <span className="text-retro-amber italic">共鳴</span>
            </h2>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
          {testimonials.map((testimonial, index) => (
            <FadeIn key={testimonial.id} delay={index * 0.1}>
              <div className="flex flex-col h-full relative group p-10 bg-retro-wood/5 border border-retro-amber/10 hover:border-retro-amber/30 transition-all duration-700">
                {/* Quote Mark Decorative */}
                <span className="font-playfair italic text-8xl text-retro-amber/10 absolute -top-8 -left-2 select-none group-hover:text-retro-amber/20 transition-colors duration-500">“</span>

                <div className="relative z-10 flex-1">
                  <p className="text-xl text-retro-cream/70 leading-relaxed font-serif italic mb-12">
                    {testimonial.content}
                  </p>
                </div>

                <div className="pt-8 border-t border-retro-amber/10">
                  <p className="font-playfair font-bold text-retro-cream tracking-widest text-lg uppercase">{testimonial.name}</p>
                  <p className="text-[10px] font-playfair italic text-retro-amber uppercase tracking-[0.3em] mt-2">{testimonial.course}</p>
                </div>

                {/* Decorative Bottom Line */}
                <div className="absolute bottom-0 left-0 w-8 h-[2px] bg-retro-amber/30 group-hover:w-full transition-all duration-700"></div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Poetic Footer */}
        <FadeIn delay={0.6}>
          <div className="mt-24 text-center">
            <p className="font-playfair italic text-retro-amber/20 text-3xl md:text-5xl max-w-4xl mx-auto leading-relaxed">
              "Where the heart aches, the strings speak."
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
