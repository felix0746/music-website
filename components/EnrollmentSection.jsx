'use client';

import { useState } from 'react';
import FadeIn from './FadeIn';
import { motion } from 'framer-motion';

// 創建 motion(Button) 元件
const MotionButton = motion('button');

export default function EnrollmentSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    confirmEmail: '',
    course: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setError('');

    // 檢查 Email 是否一致
    if (formData.email !== formData.confirmEmail) {
      setError('兩次輸入的 Email 不符！');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          course: formData.course
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('報名成功，我們會盡快與您聯繫！');
        // 清空表單
        setFormData({
          name: '',
          email: '',
          confirmEmail: '',
          course: ''
        });
      } else {
        setMessage(result.error || '提交失敗，請稍後再試');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('提交失敗，請檢查網路連線');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="enroll" className="bg-white py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:ml-20 lg:mr-20">
          <FadeIn>
            <div className="text-center mb-8 sm:mb-12">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-3 sm:mb-4">現在就開啟你的音樂旅程</h2>
                <p className="text-base sm:text-lg leading-6 sm:leading-8 text-slate-600">填寫表單，送出你的報名資訊，我會盡快與你聯繫！</p>
            </div>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="rounded-2xl bg-slate-50 p-4 sm:p-6 md:p-8 shadow-lg max-w-3xl mx-auto">
                {/* 訊息顯示區域 */}
                {message && (
                  <div className={`mb-6 p-4 rounded-lg text-center ${
                    message.includes('成功') 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {message}
                  </div>
                )}

                {/* 錯誤訊息顯示區域 */}
                {error && (
                  <div className="mb-6 p-4 rounded-lg text-center bg-red-100 text-red-800 border border-red-200">
                    {error}
                  </div>
                )}
                
                <form className="grid grid-cols-1 gap-y-4 sm:gap-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="name" className="block text-sm sm:text-base md:text-lg font-medium text-slate-700">姓名</label>
                        <input 
                            type="text" 
                            id="name" 
                            name="name" 
                            value={formData.name}
                            onChange={handleInputChange}
                            className="mt-1 sm:mt-2 block w-full px-3 py-2 sm:py-3 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base" 
                            placeholder="請輸入您的姓名" 
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm sm:text-base md:text-lg font-medium text-slate-700">Email</label>
                        <input 
                            type="email" 
                            id="email" 
                            name="email" 
                            value={formData.email} 
                            onChange={handleInputChange} 
                            className="mt-1 sm:mt-2 block w-full px-3 py-2 sm:py-3 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base" 
                            placeholder="我們會透過此信箱與您聯繫" 
                            required 
                        />
                    </div>
                    <div>
                        <label htmlFor="confirmEmail" className="block text-sm sm:text-base md:text-lg font-medium text-slate-700">確認 Email</label>
                        <input 
                            type="email" 
                            id="confirmEmail" 
                            name="confirmEmail" 
                            value={formData.confirmEmail} 
                            onChange={handleInputChange} 
                            className="mt-1 sm:mt-2 block w-full px-3 py-2 sm:py-3 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base" 
                            placeholder="請再次輸入您的 Email" 
                            required 
                        />
                    </div>
                    <div>
                        <label htmlFor="course" className="block text-sm sm:text-base md:text-lg font-medium text-slate-700">想報名的課程</label>
                        <select 
                            id="course" 
                            name="course" 
                            value={formData.course}
                            onChange={handleInputChange}
                            className="mt-1 sm:mt-2 block w-full px-3 py-2 sm:py-3 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                            required
                        >
                            <option value="">請選擇一門課程</option>
                            <option value="singing">歌唱課</option>
                            <option value="guitar">吉他課</option>
                            <option value="songwriting">創作課</option>
                            <option value="band-workshop">春曲創作團班</option>
                        </select>
                    </div>
                    <div className="text-center">
                      <MotionButton
                        type="submit"
                        disabled={isSubmitting}
                        className={`mt-4 w-full sm:w-auto font-semibold py-3 px-6 sm:px-8 rounded-lg text-sm sm:text-base md:text-lg transition-colors duration-200 ${
                          isSubmitting
                            ? 'bg-gray-400 cursor-not-allowed text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.2 }}
                      >
                        {isSubmitting ? '提交中...' : '確認送出，取得匯款資訊'}
                      </MotionButton>
                    </div>
                </form>

                {/* 分隔線 */}
                <div className="mt-8 mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-slate-50 text-slate-500 font-medium">或</span>
                    </div>
                  </div>
                </div>

                {/* LINE 報名按鈕 */}
                <div className="text-center space-y-4">
                  <a 
                    href="https://line.me/R/ti/p/@363nnttn" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 sm:px-8 rounded-lg text-sm sm:text-base md:text-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
                  >
                    <svg 
                      className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                    >
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.279.629-.631.629-.345 0-.626-.285-.626-.629V8.108c0-.345.281-.63.63-.63.346 0 .627.285.627.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                    </svg>
                    透過 LINE 官方帳號報名
                  </a>
                  <p className="text-xs sm:text-sm text-slate-500">
                    點擊按鈕，加入好友後即可傳送訊息報名！
                  </p>
                  
                </div>
              </div>
            </FadeIn>
          <FadeIn delay={0.4}>
            <div className="mt-8 sm:mt-12 text-center text-slate-600 max-w-3xl mx-auto">
                  <h3 className="font-semibold text-base sm:text-lg text-slate-800">報名流程說明</h3>
                  <div className="mt-2 space-y-1 text-sm sm:text-base">
                      <p>1. 填寫並送出上方表單。</p>
                      <p>2. 我們會透過 Email 發送付款資訊給您。</p>
                      <p>3. 完成匯款後，請將您的「姓名」與「帳號後五碼」透過 Email 或官方 Line 通知我們。</p>
                  </div>
                </div>
              </FadeIn>
        </div>
    </section>
  );
}
