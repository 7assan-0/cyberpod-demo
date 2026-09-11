# CyberPod Demo MVP

نسخة عرض تعمل في Chrome وتشرح الرحلة كاملة بدون Docker أو Core الحقيقي.

المسار:

تسجيل الدخول → Hydra Lab → Start Lab → Kali Workspace → المهام والتقدم → Submit Flag → Score

## التشغيل

```bash
npm install
npm run dev
```

ثم افتح:

http://localhost:3000

## حساب العرض

- Email: `demo@cyberpod.local`
- Password: `CyberPodDemo123!`

## أوامر الطرفية التجريبية

```text
help
nmap 10.8.0.22
services
hydra -l admin -P wordlist.txt ssh://10.8.0.22
cat flag.txt
```

## العلم

```text
CYBERPOD{hydra_ssh_cracked}
```

إعادة تحميل الصفحة تحافظ على الجلسة التجريبية عبر localStorage.

هذا المستودع للعرض فقط. العزل الحقيقي وGateway وعمال التوزيع مؤجلة بعد المسابقة.
