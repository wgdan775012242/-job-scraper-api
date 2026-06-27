const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();

// تفعيل CORS للسماح لتطبيقك الأمامي (React) بالاتصال بهذا الـ API
app.use(cors());

// نقطة النهاية (Endpoint) التي سيطلبها تطبيق الواجهة
app.get('/v1/latest', async (req, res) => {
  try {
    // مثال: جلب صفحة الوظائف من موقع خارجي (تم وضع الرابط كمثال للتوضيح)
    const targetUrl = 'https://mourjan.com/sa/riyadh/jobs/';
    const { data } = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(data);
    const jobs = [];

    // التمرير على العناصر التي تحتوي على الوظائف (يجب تعديل المحددات Selectors حسب الموقع الفعلي)
    $('.list-item').each((index, element) => {
      // نكتفي بجلب أحدث 15 وظيفة مثلاً
      if (index >= 15) return false; 

      const title = $(element).find('.title').text().trim();
      const details = $(element).find('.desc').text().trim();
      let url = $(element).find('a').attr('href');
      
      // إكمال الرابط إذا كان نسبياً
      if (url && !url.startsWith('http')) {
        url = `https://mourjan.com${url}`;
      }

      if (title) {
        jobs.push({
          id: `ext-${Date.now()}-${index}`,
          type: 'external',
          name: 'موقع مرجان للوظائف',
          title: title,
          phone: '', // لا يتم توفير الرقم عادة إلا داخل الصفحة
          specialty: 'متفرقات', 
          country: 'السعودية (الرياض)',
          details: details || 'لا توجد تفاصيل إضافية. يرجى زيارة الرابط لمعرفة المزيد.',
          timestamp: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }),
          url: url
        });
      }
    });

    // إرجاع البيانات بصيغة JSON
    res.json(jobs);
  } catch (error) {
    console.error('حدث خطأ أثناء جلب الوظائف:', error.message);
    res.status(500).json({ error: 'فشل في جلب الوظائف. يرجى المحاولة لاحقاً.' });
  }
});

// تشغيل الخادم
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Scraper API is running on http://localhost:${PORT}`);
  console.log(`Endpoint available at: http://localhost:${PORT}/v1/latest`);
});
