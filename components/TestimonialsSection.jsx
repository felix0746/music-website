const testimonials = [
  {
    id: 1,
    name: "學員A",
    course: "歌唱課",
    content: "老師的教學方式很適合我，讓我從不敢開口唱歌到現在可以自信地表演。課程內容豐富且實用，非常推薦！",
    rating: 5
  },
  {
    id: 2,
    name: "學員B", 
    course: "吉他課",
    content: "從零基礎開始學習吉他，老師很有耐心，每個技巧都講解得很詳細。現在已經可以彈奏自己喜歡的歌曲了。",
    rating: 5
  },
  {
    id: 3,
    name: "學員C",
    course: "創作課",
    content: "創作課讓我找到了表達自己的方式，老師不僅教技巧，更引導我們找到屬於自己的音樂風格。",
    rating: 5
  }
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="bg-white py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            學員見證
          </h2>
          <p className="mt-2 text-base sm:text-lg leading-6 sm:leading-8 text-slate-600 px-4">
            聽聽學員們的學習心得與成長故事
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-slate-50 rounded-lg p-4 sm:p-6 shadow-sm">
              <div className="flex items-center mb-3 sm:mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm sm:text-base text-slate-700 mb-3 sm:mb-4 leading-relaxed">
                "{testimonial.content}"
              </p>
              <div className="border-t border-slate-200 pt-3 sm:pt-4">
                <p className="font-semibold text-slate-900 text-sm sm:text-base">{testimonial.name}</p>
                <p className="text-xs sm:text-sm text-slate-600">{testimonial.course}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
