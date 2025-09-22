import Image from 'next/image';
import FadeIn from './FadeIn';

export default function InstructorSection() {
  return (
    <section id="instructor" className="bg-slate-50 py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:ml-20 lg:mr-20">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16 items-center">
          <FadeIn delay={0.2}>
            <div className="flex justify-center lg:justify-start">
              <Image
                src="https://placehold.co/400x400/e2e8f0/334155?text=Your\nPhoto"
                alt="講師照片佔位符"
                width={400}
                height={400}
                className="h-48 w-48 sm:h-56 sm:w-56 lg:h-72 lg:w-72 rounded-full object-cover shadow-lg"
              />
            </div>
          </FadeIn>
          <FadeIn delay={0.4}>
            <div className="text-center lg:text-left">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
                關於我
              </h2>
              <h3 className="mt-3 text-xl sm:text-2xl font-semibold text-slate-700">
                [你的名字或藝名]
              </h3>
              <p className="mt-6 text-base sm:text-lg leading-7 sm:leading-8 text-slate-600">
                這是一段關於你的音樂故事與教學理念的佔位符文字。Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <p className="mt-4 text-base sm:text-lg leading-7 sm:leading-8 text-slate-600">
                這裡可以放你的專業經歷，例如合作過的藝人、發行的作品、教學年資等等。Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
              </p>
              <div className="mt-6 sm:mt-8 flex justify-center gap-x-6 md:justify-start">
                <a href="#" className="text-slate-500 hover:text-slate-800">
                  <span className="sr-only">YouTube</span>
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.78 22 12 22 12s0 3.22-.42 4.814a2.506 2.506 0 0 1-1.768 1.768c-1.594.42-7.812.42-7.812.42s-6.218 0-7.812-.42a2.506 2.506 0 0 1-1.768-1.768C2.002 15.22 2 12 2 12s0-3.22.42-4.814a2.506 2.506 0 0 1-1.768-1.768C5.782 5 12 5 12 5s6.218 0 7.812.418ZM15.197 12 10 14.828V9.172L15.197 12Z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
