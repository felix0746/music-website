import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import CourseOverview from '../components/CourseOverview';
import InstructorSection from '../components/InstructorSection';
import TestimonialsSection from '../components/TestimonialsSection';
import FaqSection from '../components/FaqSection';
import EnrollmentSection from '../components/EnrollmentSection';
import LineFloatingButton from '../components/LineFloatingButton';

export default function Home() {
  return (
    <main className="bg-white">
      <Navbar />
      <HeroSection />
      <CourseOverview />
      <InstructorSection />
      <TestimonialsSection />
      <FaqSection />
      <EnrollmentSection />
      <footer className="bg-slate-50 py-8 text-center text-slate-500 pb-20 lg:pb-8">
        <div className="container mx-auto px-6">
          <p>&copy; {new Date().getFullYear()} [你的名字或工作室名稱]. All Rights Reserved.</p>
        </div>
      </footer>
      <LineFloatingButton />
    </main>
  );
}
