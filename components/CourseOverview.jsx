'use client';

import { courses } from '../lib/courseData';
import FadeIn from './FadeIn';
import { motion } from 'framer-motion';

export default function CourseOverview() {
  return (
    <section id="courses" className="py-16 sm:py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 sm:px-6 lg:ml-20 lg:mr-20">
        {/* Section Header */}
        <FadeIn>
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-4">
              我們的課程
            </h2>
            <p className="text-lg sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
              專業的音樂課程設計，滿足不同學習需求
            </p>
          </div>
        </FadeIn>

        {/* Courses List */}
        <div className="space-y-12 sm:space-y-12">
          {courses.map((course, index) => (
            <FadeIn key={course.id} delay={index * 0.2}>
              <motion.div 
                id={`course-${course.slug}`}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden"
                whileHover={{ scale: 1.05, y: -8 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
              <div className="flex flex-col lg:flex-row">
                {/* Course Image */}
                <div className="lg:w-1/2">
                  <div className="h-72 sm:h-80 lg:h-96 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
                        </svg>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{course.title}</h3>
                    </div>
                  </div>
                </div>
                
                {/* Course Content */}
                <div className="lg:w-1/2 p-8 sm:p-8 flex flex-col justify-center">
                  <h3 className="text-3xl sm:text-3xl font-bold text-gray-900 mb-6">
                    {course.title}
                  </h3>
                  <p className="text-lg sm:text-lg text-gray-600 mb-8 leading-relaxed">
                    {course.description}
                  </p>
                  
                  {/* Features List */}
                  <div className="mb-8">
                    <h4 className="text-base sm:text-base font-semibold text-gray-700 mb-4">
                      課程特色：
                    </h4>
                    <ul className="space-y-3">
                      {course.features.map((feature, index) => (
                        <li key={index} className="text-base sm:text-base text-gray-600 flex items-start">
                          <span className="text-blue-500 mr-3 flex-shrink-0 mt-1">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Button */}
                  <a 
                    href="#enroll" 
                    className="inline-block w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-xl transition-colors duration-200 text-lg sm:text-lg text-center min-h-[56px] flex items-center justify-center"
                  >
                    立即報名
                  </a>
                </div>
              </div>
            </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
