import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { name, email, course } = await request.json();

    // 驗證必要欄位
    if (!name || !email || !course) {
      return Response.json(
        { error: '缺少必要欄位：姓名、Email 或課程' },
        { status: 400 }
      );
    }

    // 課程名稱對應
    const courseNames = {
      'singing': '歌唱課',
      'guitar': '吉他課',
      'songwriting': '創作課',
      'band-workshop': '春曲創作團班'
    };

    const courseName = courseNames[course] || course;

    // 發送兩封 Email
    const [adminEmailResult, studentEmailResult] = await Promise.all([
      // 第一封：給管理員的通知信
      resend.emails.send({
        from: 'MyMusic <onboarding@resend.dev>',
        to: ['johnsonyao466@gmail.com'], // 管理員信箱
        subject: `「${courseName}」新課程報名通知！`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">新課程報名通知</h2>
            <p>您好！有新的學員報名課程，詳細資訊如下：</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #334155; margin-top: 0;">學員資訊</h3>
              <p><strong>姓名：</strong>${name}</p>
              <p><strong>Email：</strong>${email}</p>
              <p><strong>報名課程：</strong>${courseName}</p>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">
              請盡快與學員聯繫，確認付款資訊。
            </p>
          </div>
        `,
      }),
      
      // 第二封：給學員的付款資訊信
      resend.emails.send({
        from: 'MyMusic <onboarding@resend.dev>',
        to: [email], // 學員信箱
        subject: `感謝報名！這是您的「${courseName}」課程付款資訊`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">感謝您的報名！</h2>
            <p>親愛的 ${name}，</p>
            <p>感謝您報名「${courseName}」課程！以下是您的付款資訊：</p>
            
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e40af;">
              <h3 style="color: #1e40af; margin-top: 0;">付款資訊</h3>
              <div style="background-color: white; padding: 15px; border-radius: 6px; margin: 10px 0;">
                <p style="margin: 8px 0;"><strong>銀行：</strong>[你的銀行名稱] ([銀行代碼])</p>
                <p style="margin: 8px 0;"><strong>帳號：</strong>[你的銀行帳號]</p>
                <p style="margin: 8px 0;"><strong>戶名：</strong>[你的戶名]</p>
                <p style="margin: 8px 0;"><strong>金額：</strong>[課程金額]</p>
              </div>
            </div>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #92400e; margin-top: 0;">重要提醒</h4>
              <p style="color: #92400e; margin: 5px 0;">• 請於 3 天內完成付款</p>
              <p style="color: #92400e; margin: 5px 0;">• 付款完成後，請將「姓名」與「帳號後五碼」透過 Email 回報給我們</p>
              <p style="color: #92400e; margin: 5px 0;">• 我們會在確認付款後 24 小時內與您聯繫</p>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">
              如有任何問題，請隨時與我們聯繫。<br>
              祝您學習愉快！
            </p>
            
            <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
              <p>MyMusic 音樂課程</p>
            </div>
          </div>
        `,
      })
    ]);

    // 檢查是否有錯誤
    if (adminEmailResult.error || studentEmailResult.error) {
      console.error('Resend error:', adminEmailResult.error || studentEmailResult.error);
      return Response.json(
        { error: '發送 Email 失敗' },
        { status: 500 }
      );
    }

    return Response.json(
      { 
        success: true, 
        message: '報名成功！付款資訊已發送至您的信箱，請查收。',
        adminEmailId: adminEmailResult.data?.id,
        studentEmailId: studentEmailResult.data?.id
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: '伺服器錯誤' },
      { status: 500 }
    );
  }
}
