import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import CourseOverview from '../components/CourseOverview';
import InstructorSection from '../components/InstructorSection';
import TestimonialsSection from '../components/TestimonialsSection';
import FaqSection from '../components/FaqSection';
import EnrollmentSection from '../components/EnrollmentSection';

export default function Home() {
  return (
    <main className="bg-retro-dark min-h-screen relative selection:bg-retro-amber selection:text-retro-dark overflow-hidden">
      {/* Global Grain Overlay for Retro Vibe */}
      <div className="fixed inset-0 pointer-events-none z-[9999] opacity-[0.03] mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

      <Navbar />
      <HeroSection />
      <CourseOverview />
      <InstructorSection />
      <TestimonialsSection />
      <FaqSection />
      <EnrollmentSection />
      <footer className="bg-retro-dark py-24 text-center text-retro-cream/20 pb-40 lg:pb-20 border-t border-retro-amber/5">
        <div className="container mx-auto px-6">
          <div className="mb-8">
            <span className="font-playfair text-3xl tracking-[0.4em] text-retro-cream uppercase font-black">
              SOUL <span className="text-retro-amber italic font-normal">Notes</span>
            </span>
          </div>
          <p className="font-serif italic text-sm tracking-widest uppercase">
            &copy; {new Date().getFullYear()} SOUL NOTES MUSIC STUDIO. <br className="sm:hidden" /> ALL SOULS RESERVED.
          </p>
          <div className="mt-10 flex justify-center items-center gap-6 opacity-30">
            <div className="w-12 h-px bg-retro-amber"></div>
            <div className="w-2 h-2 rotate-45 border border-retro-amber"></div>
            <div className="w-12 h-px bg-retro-amber"></div>
          </div>
        </div>
      </footer>
    </main>
  );
}
