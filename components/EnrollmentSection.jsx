'use client';

import FadeIn from './FadeIn';

export default function EnrollmentSection() {
  return (
    <section id="enroll" className="bg-white py-16 sm:py-16 md:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-6 sm:px-6 lg:ml-20 lg:mr-20">
        <FadeIn>
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-4 sm:mb-4">
              現在就開啟你的音樂旅程
            </h2>
            <p className="text-lg sm:text-lg leading-6 sm:leading-8 text-slate-600">
              透過 LINE 官方帳號完成報名，安全獲取付款資訊！
            </p>
          </div>
        </FadeIn>
        
        <FadeIn delay={0.2}>
          <div className="rounded-2xl bg-slate-50 p-8 sm:p-6 md:p-8 shadow-lg max-w-3xl mx-auto text-center">
            {/* LINE 報名按鈕 */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-2xl sm:text-2xl font-bold text-slate-800">
                  立即透過 LINE 報名
                </h3>
                <p className="text-lg sm:text-lg text-slate-600">
                  加入我們的 LINE 官方帳號，直接在 LINE 中完成報名並獲取付款資訊
                </p>
              </div>
              
              <a 
                href="https://line.me/R/ti/p/@363nnttn" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white font-semibold py-5 px-8 sm:px-12 rounded-xl text-xl sm:text-xl transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 min-h-[64px]"
              >
                <svg
                  className="w-8 h-8 sm:w-8 sm:h-8 mr-4 sm:mr-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.279.629-.631.629-.345 0-.626-.285-.626-.629V8.108c0-.345.281-.63.63-.63.346 0 .627.285.627.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
                加入 LINE 官方帳號報名
              </a>
              
              <div className="space-y-2 text-sm sm:text-base text-slate-500">
                <p>✅ 直接在 LINE 中填寫報名資訊</p>
                <p>✅ 自動獲取安全的付款資訊</p>
                <p>✅ 完成付款後透過 LINE 回報</p>
              </div>
            </div>
          </div>
        </FadeIn>
        
        <FadeIn delay={0.4}>
          <div className="mt-8 sm:mt-12 text-center text-slate-600 max-w-3xl mx-auto">
            <h3 className="font-semibold text-base sm:text-lg text-slate-800">報名流程說明</h3>
            <div className="mt-2 space-y-1 text-sm sm:text-base">
              <p>1. 點擊上方按鈕加入 LINE 官方帳號。</p>
              <p>2. 在 LINE 中填寫報名資訊（姓名、課程選擇等）。</p>
              <p>3. 我們會透過 LINE 發送安全的付款資訊給您。</p>
              <p>4. 完成匯款後，請將您的「姓名」與「帳號後五碼」透過 LINE 回報給我們。</p>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}