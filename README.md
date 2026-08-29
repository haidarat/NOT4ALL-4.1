# Discord Voice 24/7 Bot

บอท Discord ที่เข้าห้องเสียงและอยู่แบบ 24/7 โดยส่งสัญญาณเสียงเงียบ (silence) เพื่อไม่ให้หลุดจากห้อง รองรับการ deploy บน [Render](https://render.com) พร้อมระบบ self-ping ป้องกัน service sleep

ทุกคนสามารถ fork หรือ deploy โปรเจกต์นี้ไปใช้กับบอทและเซิร์ฟเวอร์ Discord ของตัวเองได้ทันที โดยไม่ต้องแก้โค้ดเลย — ใส่ค่าของตัวเองผ่าน Environment Variables เท่านั้น

## 🚀 Deploy บน Render (แนะนำ)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/haidarat/NOT4ALL-4.1)

กดปุ่มด้านบน แล้วทำตามขั้นตอน:

1. Render จะให้ล็อกอิน/เชื่อมต่อ GitHub แล้ว fork หรือเชื่อม repo นี้เข้ากับ Render อัตโนมัติ
2. ระบบจะถามค่า Environment Variables ที่จำเป็น (ดูตารางด้านล่าง) — กรอกแล้วกด Deploy
3. รอสักครู่ Render จะ build และรันบอทให้อัตโนมัติ

### ค่าที่ต้องกรอก (Environment Variables)

| ตัวแปร | คำอธิบาย | วิธีหา |
|---|---|---|
| `DISCORD_TOKEN` | Token ของบอท Discord ของคุณเอง | [Discord Developer Portal](https://discord.com/developers/applications) → สร้าง/เลือกแอป → แท็บ **Bot** → **Reset Token** เพื่อคัดลอก |
| `GUILD_ID` | ID ของเซิร์ฟเวอร์ Discord ที่ต้องการให้บอทเข้า | เปิด Developer Mode ใน Discord (Settings → Advanced) แล้วคลิกขวาที่ชื่อเซิร์ฟเวอร์ → **Copy Server ID** |
| `VOICE_CHANNEL_ID` | ID ของห้องเสียงที่ต้องการให้บอทเข้า | คลิกขวาที่ห้องเสียง → **Copy Channel ID** |

ตัวแปรอื่นๆ (เช่น `PING_INTERVAL_MS`, `PORT`) มีค่าเริ่มต้นให้แล้ว ไม่จำเป็นต้องแก้ไข

**⚠️ Token เป็นของส่วนตัว ห้ามแชร์ให้ใครหรือใส่ในโค้ด — ให้กรอกในหน้า Environment ของ Render เท่านั้น ถ้า Token หลุดให้ไป Reset Token ใหม่ทันทีที่ Developer Portal**

## 🔧 การตั้งค่าบอทใน Discord Developer Portal

ก่อน deploy ต้องเตรียมบอทของตัวเองก่อน:

1. เข้า [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**
2. ไปที่แท็บ **Bot** → กด **Reset Token** เพื่อคัดลอก Token (เก็บไว้ใช้ตอน deploy)
3. เปิดสิทธิ์ที่จำเป็น: **Server Members Intent** และ **Voice States Intent** (ถ้ามีตัวเลือก)
4. ไปที่แท็บ **OAuth2 → URL Generator** เลือก scope `bot` และสิทธิ์ **Connect**, **Speak** แล้วใช้ลิงก์ที่ได้เชิญบอทเข้าเซิร์ฟเวอร์ของคุณ

## ⏰ ใช้ cron-job.org ช่วยปลุก (แนะนำเพิ่มเติม)

โปรเจกต์นี้มีระบบ self-ping ในตัวอยู่แล้ว แต่ Render free plan บางครั้งอาจ sleep เร็วกว่าที่คาด การใช้บริการ ping จากภายนอกอย่าง [cron-job.org](https://cron-job.org) (ฟรี) จะช่วยเพิ่มความเสถียรอีกชั้น โดยยิง request มาปลุก service ตามเวลาที่ตั้งไว้

### วิธีตั้งค่า

1. สมัครสมาชิกฟรีที่ [cron-job.org](https://console.cron-job.org/signup)
2. ยืนยันอีเมลแล้วล็อกอินเข้าหน้า Dashboard
3. กด **CREATE CRONJOB**
4. กรอกข้อมูล:
   - **Title**: ตั้งชื่ออะไรก็ได้ เช่น `Keep Discord Bot Awake`
   - **Address (URL)**: ใส่ URL ของ service บน Render (หน้า Render Dashboard → service ของคุณ → คัดลอก URL ด้านบน เช่น `https://your-service-name.onrender.com`)
5. ที่ส่วน **Schedule** เลือก:
   - **Every**: `10 minutes` (หรือถี่กว่านี้ก็ได้ แต่ไม่ควรเกิน 14 นาที เพราะ Render free plan จะ sleep หลัง idle ~15 นาที)
6. กด **CREATE** เป็นอันเสร็จ — cron-job.org จะยิง request มาที่ URL นี้ตามรอบเวลาที่ตั้งไว้ตลอด 24 ชั่วโมง

### ตรวจสอบว่าทำงาน

- ในหน้า cron-job.org ไปที่ cronjob ที่สร้างไว้ จะเห็นประวัติการรัน (execution history) พร้อมสถานะ เช่น `200 OK`
- ดู log ฝั่ง Render ควรเห็นข้อความ request เข้ามาตามรอบที่ตั้งไว้

> 💡 ใช้ทั้ง self-ping ในตัวโค้ด **และ** cron-job.org พร้อมกันได้เลย ไม่ขัดแย้งกัน ยิ่งช่วยลดโอกาส service หลับได้มากขึ้น

## 💻 รันบนเครื่องตัวเอง (ไม่ผ่าน Render)

```bash
git clone https://github.com/haidarat/NOT4ALL-4.1.git
cd NOT4ALL-4.1
npm install
cp .env.example .env
# แก้ไข .env ใส่ค่าของคุณ แล้วรัน
npm start
```

## 📄 License

โปรเจกต์นี้เปิดเป็น [MIT License](./LICENSE) — นำไปใช้ แก้ไข หรือแจกจ่ายต่อได้อย่างอิสระ
