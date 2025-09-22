'use client';

import { useState } from 'react';
import FadeIn from './FadeIn';

export default function EnrollmentSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    course: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

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
    
    try {
      const response = await fetch('/api/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('報名成功，我們會盡快與您聯繫！');
        // 清空表單
        setFormData({
          name: '',
          email: '',
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
        <div className="container mx-auto max-w-2xl px-4 sm:px-6">
        <FadeIn>
          <div className="text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900">現在就開啟你的音樂旅程</h2>
              <p className="mt-2 text-base sm:text-lg leading-6 sm:leading-8 text-slate-600 px-4">填寫表單，送出你的報名資訊，我會盡快與你聯繫！</p>
          </div>
        </FadeIn>
            <FadeIn delay={0.2}>
              <div className="mt-8 sm:mt-12 rounded-2xl bg-slate-50 p-4 sm:p-6 md:p-8 shadow-lg">
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
                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className={`mt-4 w-full sm:w-auto font-semibold py-3 px-6 sm:px-8 rounded-lg text-sm sm:text-base md:text-lg transition-colors duration-200 ${
                          isSubmitting 
                            ? 'bg-gray-400 cursor-not-allowed text-white' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isSubmitting ? '提交中...' : '確認送出，取得匯款資訊'}
                      </button>
                    </div>
                </form>
              </div>
            </FadeIn>
            <FadeIn delay={0.4}>
              <div className="mt-8 sm:mt-12 text-center text-slate-600">
                  <h3 className="font-semibold text-base sm:text-lg text-slate-800">報名流程說明</h3>
                  <div className="mt-2 space-y-1 text-sm sm:text-base">
                      <p>1. 填寫並送出上方表單。</p>
                      <p>2. **送出後，頁面將會顯示匯款帳號（此為佔位符功能，未來會串接後端）。**</p>
                      <p>3. 完成匯款後，請將您的「姓名」與「帳號後五碼」透過 Email 或官方 Line 通知我們。</p>
                  </div>
              </div>
            </FadeIn>
        </div>
    </section>
  );
}
