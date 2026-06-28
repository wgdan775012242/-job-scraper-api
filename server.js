const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
// استخدام المنفذ الذي يحدده Render أو 3000 محلياً
const PORT = process.env.PORT || 3000;

// تفعيل CORS للسماح لتطبيقك بالتواصل مع هذا الخادم
app.use(cors());
app.use(express.json());

// دالة ذكية لاستخراج أرقام الهواتف من النصوص (سعودية، يمنية، أو عامة)
const extractPhoneNumbers = (text) => {
    if (!text) return 'غير متوفر';
    // نمط للبحث عن الأرقام التي تبدأ بـ 05، 00966، +966، 00967، +967، 77، 73، 71
    const phoneRegex = /(?:\+966|00966|05\d)\s*\d{3}\s*\d{4}|(?:\+967|00967|7[13708])\s*\d{3}\s*\d{3,4}|(?:05|01)\d{8}/g;
    const matches = text.match(phoneRegex);
    
    if (matches && matches.length > 0) {
        // إزالة التكرارات
        const uniqueNumbers = [...new Set(matches)];
        return uniqueNumbers.join(' | ');
    }
    
    // محاولة بنمط أبسط إذا لم ينجح النمط الأول
    const simpleRegex = /(?:(?:\+|00)\d{1,3}[\s-]?)?(?:\d{2,4}[\s-]?){2,4}\d{2,4}/g;
    const simpleMatches = text.match(simpleRegex);
    if (simpleMatches) {
        const valid = simpleMatches.filter(m => m.replace(/\D/g, '').length >= 9);
        if (valid.length > 0) return [...new Set(valid)].join(' | ');
    }
    
    return 'غير متوفر';
};

// راوتر فحص صحة الخادم (مفيد لـ Render لمنع توقفه)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'active', message: 'Server is running' });
});

// المسار الرئيسي لجلب الوظائف (يجب أن يتطابق مع ما يطلبه تطبيقك الأمامي)
app.get('/v1/latest', async (req, res) => {
    try {
        const jobs = [];
        console.log("بداية جلب الوظائف من المواقع...");

        // 1. جلب الوظائف من موقع مرجان (Mourjan)
        try {
            const mourjanRes = await axios.get('https://mourjan.com/sa/jobs/', {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html'
                },
                timeout: 10000
            });
            const $1 = cheerio.load(mourjanRes.data);
            
            $1('.listing-item, .item, .ad-box').each((index, element) => {
                if (index >= 15) return false; // نأخذ أول 15 وظيفة
                
                const title = $1(element).find('.title, h2, h3').text().replace(/\s+/g, ' ').trim();
                const desc = $1(element).find('.desc, .description, p').text().replace(/\s+/g, ' ').trim();
                let url = $1(element).find('a').attr('href');
                
                if (url && !url.startsWith('http')) {
                    url = 'https://mourjan.com' + url;
                }
                
                if (title && title.length > 5) {
                    jobs.push({
                        id: `mourjan-${Date.now()}-${index}`,
                        type: 'external',
                        name: 'موقع مرجان',
                        title: title,
                        phone: extractPhoneNumbers(desc) || extractPhoneNumbers(title),
                        details: desc || 'تفاصيل الوظيفة متوفرة في الرابط.',
                        url: url || 'https://mourjan.com/sa/jobs/',
                        timestamp: new Date().toLocaleDateString('ar-SA')
                    });
                }
            });
            console.log(`تم جلب وظائف مرجان بنجاح.`);
        } catch (e) {
            console.error('خطأ في جلب وظائف مرجان:', e.message);
        }

        // 2. جلب وظائف من موقع وظيفة مشتلي (wazifa.mshatly)
        try {
            const mshatlyRes = await axios.get('https://wazifa.mshatly.com/', {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                timeout: 10000
            });
            const $2 = cheerio.load(mshatlyRes.data);
            
            $2('article, .post, .job-item').each((index, element) => {
                 if (index >= 15) return false;
                 const title = $2(element).find('.entry-title, h2, h3').text().replace(/\s+/g, ' ').trim();
                 const desc = $2(element).find('.entry-content, .excerpt, p').text().replace(/\s+/g, ' ').trim();
                 let url = $2(element).find('a').first().attr('href');
                 
                 if (title && title.length > 5) {
                    jobs.push({
                        id: `mshatly-${Date.now()}-${index}`,
                        type: 'external',
                        name: 'وظيفة مشتلي',
                        title: title,
                        phone: extractPhoneNumbers(desc) || extractPhoneNumbers(title),
                        details: desc || 'يرجى زيارة الرابط لمشاهدة التفاصيل.',
                        url: url || 'https://wazifa.mshatly.com/',
                        timestamp: new Date().toLocaleDateString('ar-SA')
                    });
                }
            });
            console.log(`تم جلب وظائف مشتلي بنجاح.`);
        } catch (e) {
            console.error('خطأ في جلب وظائف مشتلي:', e.message);
        }

        // 3. جلب وظائف من موقع مستعد السعودية (mosta3ed)
        try {
            const mosta3edRes = await axios.get('https://mosta3ed.com/', {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 10000
            });
            const $3 = cheerio.load(mosta3edRes.data);
            
            $3('.job-listing, .item, .post-item').each((index, element) => {
                 if (index >= 15) return false;
                 const title = $3(element).find('.title, h2, h3').text().replace(/\s+/g, ' ').trim();
                 const desc = $3(element).find('.description, p, .content').text().replace(/\s+/g, ' ').trim();
                 let url = $3(element).find('a').attr('href');
                 
                 if (title && title.length > 5) {
                    jobs.push({
                        id: `mosta3ed-${Date.now()}-${index}`,
                        type: 'external',
                        name: 'مستعد السعودية',
                        title: title,
                        phone: extractPhoneNumbers(desc) || extractPhoneNumbers(title),
                        details: desc || 'متاح تفاصيل إضافية في الموقع.',
                        url: url || 'https://mosta3ed.com/',
                        timestamp: new Date().toLocaleDateString('ar-SA')
                    });
                }
            });
            console.log(`تم جلب وظائف مستعد بنجاح.`);
        } catch (e) {
            console.error('خطأ في جلب وظائف مستعد:', e.message);
        }

        // ترتيب الوظائف عشوائياً لدمجها من مختلف المواقع
        const shuffledJobs = jobs.sort(() => 0.5 - Math.random());

        if (shuffledJobs.length === 0) {
            return res.json([{
                id: `fallback-${Date.now()}`,
                type: 'external',
                name: 'تنبيه النظام',
                title: 'تحديث البيانات جارٍ...',
                phone: 'غير متوفر',
                details: 'لم نتمكن من سحب الوظائف الحالية بسبب حماية المواقع (Cloudflare). يرجى المحاولة لاحقاً أو زيارة المواقع مباشرة.',
                url: '#',
                timestamp: new Date().toLocaleDateString('ar-SA')
            }]);
        }

        res.json(shuffledJobs);
    } catch (error) {
        console.error("خطأ عام في الخادم:", error);
        res.status(500).json({ error: 'فشل في جلب الوظائف', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ خادم سحب الوظائف يعمل بنجاح على المنفذ ${PORT}`);
});
