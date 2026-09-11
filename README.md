# CyberPod Demo — Kali desktop simulation

محاكاة سطح Kali داخل المتصفح: ترمينال + Firefox + موقع Nexora للتدريب على Hydra.

```bash
npm install
npm run dev
```

http://127.0.0.1:3000

اسم المستخدم وكلمة السر للكل: `bisha` / `bisha`

بعد Unlock:

1. افتح Terminal ونفّذ `nmap 10.8.0.22`
2. افتح Firefox ESR على `http://10.8.0.22/login`
3. شغّل Hydra من الترمينال
4. ادخل للموقع بـ `bisha` / `bisha`
5. انسخ العلم وسلّمه من الصندوق أسفل اليمين

هذه محاكاة تعليمية. لا يوجد اتصال شبكة حقيقي ولا هجوم على أهداف خارج المختبر.
