// server.js
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();

// تفعيل CORS للسماح لموقعك بطلب البيانات
app.use(cors());

// نقطة النهاية التي تقوم بجلب أحدث الوظائف (Scraping API Endpoint)
app.get('/v1/latest', async (req, res) => {
    try {
        const jobs = [];
        
        // 1. استخراج البيانات من موقع مرجان (كمثال)
        try {
            const mourjanUrl = 'https://sa.mourjan.com/jobs/';
            const mourjanResponse = await axios.get(mourjanUrl, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
                }
            });
            const $ = cheerio.load(mourjanResponse.data);
            
            // قراءة أحدث 10 إعلانات توظيف
            $('.listing-item').slice(0, 10).each((index, element) => {
                const title = $(element).find('.title').text().trim();
                const link = $(element).find('a.listing-link').attr('href');
                const details = $(element).find('.desc').text().trim();
                const location = $(element).find('.location').text().trim() || 'السعودية';
                
                if (title && link) {
                    jobs.push({
                        id: `mourjan-${Date.now()}-${index}`,
                        type: 'external',
                        name: 'موقع مرجان للوظائف',
                        title: title,
                        phone: "", // الوظائف المسحوبة غالباً تتطلب التقديم عبر الموقع
                        specialty: 'فرص عمل متنوعة',
                        country: location,
                        details: details || "التفاصيل والشروط متوفرة في رابط الإعلان الأصلي.",
                        timestamp: new Date().toLocaleDateString("ar-EG", { year: 'numeric', month: 'short', day: 'numeric' }),
                        url: link.startsWith('http') ? link : `https://sa.mourjan.com${link}`
                    });
                }
            });
        } catch (error) {
            console.error('خطأ في جلب بيانات مرجان:', error.message);
        }

        // 2. يمكنك تكرار نفس العملية لمواقع أخرى مثل "وظائف العرب" هنا...
        
        // إرسال البيانات بصيغة JSON لكي يتلقاها تطبيق React
        res.json(jobs);

    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ غير متوقع أثناء المعالجة' });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 Scraping API Server is running on port ${PORT}`);
    console.log(`Test URL: http://localhost:${PORT}/v1/latest`);
});
