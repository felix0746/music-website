'use client';

import { courses } from '../lib/courseData';
import FadeIn from './FadeIn';
import { motion } from 'framer-motion';

export default function CourseOverview() {
  return (
    <section id="courses" className="bg-retro-dark py-32 relative overflow-hidden">
      {/* Subtle Wood Texture */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <FadeIn>
          <div className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-retro-amber/10 pb-12">
            <div className="max-w-2xl">
              <span className="font-playfair italic text-retro-amber uppercase tracking-[0.4em] text-xs mb-4 block">Our Curriculum</span>
              <h2 className="text-5xl md:text-7xl font-playfair font-black text-retro-cream leading-tight">
                啟發靈魂的 <br />
                <span className="text-retro-amber italic">深度導引</span>
              </h2>
            </div>
            <p className="font-serif italic text-retro-cream/40 max-w-xs md:text-right leading-relaxed">
              每一堂課程，都是一場與美好旋律對話的過程。
            </p>
          </div>
        </FadeIn>

        <div className="space-y-32">
          {courses.map((course, index) => (
            <FadeIn key={course.id} delay={index * 0.1}>
              <div
                id={`course-${course.slug}`}
                className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-16 lg:gap-24 items-center`}
              >
                {/* Course Image / Decorative Placeholder */}
                <div className="w-full lg:w-3/5 relative">
                  <motion.div
                    className="aspect-[16/10] bg-retro-wood/20 overflow-hidden border border-retro-amber/10"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.6 }}
                  >
                    <div className="w-full h-full bg-gradient-to-br from-retro-dark via-retro-dark to-retro-amber/10 flex items-center justify-center relative overflow-hidden group">
                      <span className="absolute top-6 left-6 font-playfair text-[80px] text-retro-amber/5 leading-none select-none uppercase italic font-black">{index + 1}</span>

                      <div className="relative z-10 text-center">
                        <div className="w-24 h-24 border border-retro-amber/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-retro-amber/10 transition-colors duration-500">
                          <span className="font-playfair text-3xl text-retro-amber italic">S</span>
                        </div>
                        <h3 className="text-3xl font-playfair text-retro-cream tracking-[0.2em] px-4 font-bold">{course.title}</h3>
                      </div>

                      {/* Film Grain/Moody Overlay */}
                      <div className="absolute inset-0 bg-retro-dark/40 group-hover:bg-retro-dark/20 transition-colors duration-500"></div>
                      <div className="absolute -bottom-10 -right-10 w-60 h-60 border border-retro-amber/5 rounded-full"></div>
                    </div>
                  </motion.div>
                </div>

                {/* Course Content */}
                <div className="w-full lg:w-2/5 flex flex-col justify-center">
                  <div className="mb-4 italic text-retro-amber font-playfair text-xl opacity-40">Section {index + 1}</div>
                  <h3 className="text-3xl sm:text-4xl font-playfair font-bold text-retro-cream mb-8 leading-tight">
                    {course.title}
                  </h3>
                  <p className="text-lg text-retro-cream/60 mb-10 leading-relaxed font-serif italic">
                    {course.description}
                  </p>

                  {/* Features List */}
                  <div className="mb-12">
                    <ul className="grid grid-cols-1 gap-5 font-serif">
                      {course.features.map((feature, idx) => (
                        <li key={idx} className="text-retro-cream/40 flex items-center gap-4 text-sm group">
                          <div className="w-1.5 h-[1px] bg-retro-amber/40 group-hover:w-4 transition-all duration-300"></div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Link */}
                  <a
                    href="#enroll"
                    className="inline-flex items-center gap-4 group text-retro-amber hover:text-retro-cream transition-all duration-500 font-playfair italic tracking-widest text-sm uppercase"
                  >
                    <span>預約對話</span>
                    <div className="w-12 h-px bg-retro-amber/30 group-hover:w-20 group-hover:bg-retro-cream transition-all duration-500"></div>
                  </a>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
