# CyberPod Demo MVP

نسخة عرض في Chrome وفق عقد الفرونت `/api/v1`. ليست منصة إنتاج.

```bash
npm install
npm run dev
```

http://127.0.0.1:3000

حساب العرض: `demo@cyberpod.local` / `CyberPodDemo123!`

العلم يُصدر لكل جلسة بعد Start، ولا يُكتب في YAML أو كتالوج المختبر أو استجابة API. اقرأه من مساحة العمل بعد المهام، ثم سلّمه عبر `POST /sessions/{id}/flags`.

الوضع الحي: ضع `VITE_API_BASE` على أصل الـ API. المسارات المستخدمة:

- `POST /api/v1/auth/login` و `POST /api/v1/auth/logout` و `GET /api/v1/auth/me`
- `GET /api/v1/labs`
- `POST /api/v1/labs/{id}/sessions` ثم `POST /api/v1/sessions/{id}/start` إذا بقيت `CREATED`
- `GET /api/v1/sessions/{id}/status`
- `POST /api/v1/sessions/{id}/flags`

الدرجة و`revision` و`expires_at` و`server_time` تأتي من السيرفر. المؤقت لا يستخدم ساعة الجهاز مباشرة.
