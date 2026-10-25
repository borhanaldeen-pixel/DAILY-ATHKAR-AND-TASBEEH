# الأذكار اليومية — PWA

## رفع على GitHub Pages
ارفع **كل محتويات هذا المجلد** إلى جذر المستودع، ثم فعّل GitHub Pages من إعدادات المستودع.

## الملفات
- `index.html` التطبيق الأصلي مع ربط Manifest وService Worker.
- `manifest.webmanifest` إعدادات PWA والأيقونات واللقطات والاختصارات.
- `sw.js` التخزين المؤقت والعمل دون اتصال وBackground Sync وPush/Periodic Sync.
- `icons/` أيقونات PNG بالمقاسات الصحيحة.
- `screenshots/` لقطات العرض داخل صفحة تثبيت PWA.
- `share.html` نقطة استقبال المشاركة.
- `file-handler.html` نقطة استقبال فتح الملفات.

> ملاحظة: ميزات Push وPeriodic Background Sync تعتمد على دعم المتصفح وعلى منح الصلاحيات. إرسال Push فعلي يحتاج خادم Push/VAPID؛ ملف الخدمة هنا يجهز جهة الاستقبال لكنه لا ينشئ خادم إرسال.
> ميزات IARC وrelated_applications تحتاج بيانات تطبيق أصلي حقيقية، لذلك لم يتم اختلاق معرّفات غير موجودة.
