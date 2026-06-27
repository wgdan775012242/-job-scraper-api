const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// تفعيل CORS للسماح لتطبيقك (Frontend) بالاتصال بهذا الـ API
app.use(cors());

// دالة لجلب الوظائف من موقع مرجان (كمثال)
async function scrapeMourjanJobs() {
    try {
        // رابط قسم وظائف السعودية كمثال
        const url = 'https://sa.mourjan.com/jobs/';
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(data);
        const jobs = [];

        // استخراج الإعلانات (هذه الـ Selectors تعتمد على هيكل موقع مرجان الحالي وقد تتغير)
        $('.ad-row').each((index, element) => {
            if (index >= 15) return false; // جلب أول 15 إعلان فقط

            const title = $(element).find('.ad-title a').text().trim();
            const link = $(element).find('.ad-title a').attr('href');
            const details = $(element).find('.ad-desc').text().trim();
            const location = $(element).find('.ad-cat-box').text().trim();
            const timestamp = $(element).find('.ad-date').text().trim();

            if (title) {
                jobs.push({
                    id: `mourjan-${index}-${Date.now()}`,
                    type: 'external',
                    name: 'موقع مرجان للوظائف',
                    title: title,
                    phone: '', // أرقام الهواتف غالباً تحتاج الدخول لصفحة الإعلان
                    specialty: 'وظائف عامة',
                    country: location || 'السعودية',
                    details: details,
                    timestamp: timestamp || new Date().toLocaleDateString("ar-EG", { year: 'numeric', month: 'short', day: 'numeric' }),
                    url: link ? `https://sa.mourjan.com${link}` : url
                });
            }
        });

        return jobs;
    } catch (error) {
        console.error('Error scraping Mourjan:', error.message);
        return [];
    }
}

// نقطة النهاية (API Endpoint) الخاصة بجلب الوظائف
app.get('/v1/latest', async (req, res) => {
    console.log('Fetching latest jobs...');
    
    // يمكنك هنا إضافة المزيد من الدوال لجلب بيانات من مواقع أخرى ودمجها
    const mourjanJobs = await scrapeMourjanJobs();
    
    // في حال أردت إضافة وظائف من "وظائف العرب" يمكن دمجها هنا
    const allJobs = [...mourjanJobs];

    if (allJobs.length === 0) {
        // إرسال بيانات احتياطية في حال فشل الجلب
        return res.json([
             {
                id: "ext-1",
                type: "external",
                name: "موقع مرجان للوظائف",
                title: "مطلوب مهندس مدني خبرة 5 سنوات",
                phone: "",
                specialty: "هندسة مدنية",
                country: "السعودية (الرياض)",
                details: "شركة مقاولات كبرى في الرياض تطلب مهندس مدني...",
                timestamp: new Date().toLocaleDateString("ar-EG", { year: 'numeric', month: 'short', day: 'numeric' }),
                url: "https://sa.mourjan.com/"
              }
        ]);
    }

    res.json(allJobs);
});

// فحص حالة الخادم
app.get('/', (req, res) => {
    res.send('Job Scraper API is running...');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
