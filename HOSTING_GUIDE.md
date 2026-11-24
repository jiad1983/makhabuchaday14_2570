# คู่มือการนำเว็บไซต์ขึ้นโฮสต์ (Hosting Deployment Guide)

เว็บไซต์ **มาฆบูชาคณะสงฆ์อำเภอศีขรภูมิ** รองรับการอัปโหลดขึ้นโฮสต์ได้ทั้งแบบ **Static Web Hosting** (เช่น cPanel, DirectAdmin, Plesk, Netlify, Vercel, Cloudflare Pages) และแบบ **Node.js Server**

---

## วิธีที่ 1: อัปโหลดขึ้นเว็บโฮสต์ทั่วไป (cPanel / DirectAdmin / Apache / Nginx) — แนะนำ

1. รันคำสั่งสร้างไฟล์สำหรับขึ้นโฮสต์:
   ```bash
   npm install
   npm run build
   ```
2. ระบบจะสร้างโฟลเดอร์ **`dist/`** ซึ่งภายในประกอบด้วย:
   - `index.html` (กำหนดพาธแบบสัมพัทธ์ `./assets/...` สามารถวางทั้งในโดเมนหลัก เช่น `https://yourdomain.com/` หรือโฟลเดอร์ย่อย เช่น `https://yourdomain.com/makha/` ได้ทันที)
   - `assets/` (ไฟล์ JS, CSS ที่ถูกบีบอัดพร้อมใช้งาน)
   - `.htaccess` (ตั้งค่า SPA Routing และ MIME Types สำหรับ Apache/cPanel/DirectAdmin อัตโนมัติ)
   - `_redirects` (สำหรับ Netlify / Cloudflare Pages)
3. นำไฟล์และโฟลเดอร์ทั้งหมด **ภายใน `dist/`** (รวมถึงไฟล์ `.htaccess`) อัปโหลดขึ้นไปยังโฟลเดอร์ `public_html/` (หรือโฟลเดอร์ย่อยที่ต้องการ) บนโฮสต์ผ่าน File Manager หรือ FTP ก็พร้อมใช้งานเป็นเว็บไซต์ทันที

---

## วิธีที่ 2: นำขึ้น Netlify / Vercel / Cloudflare Pages

- **Build command:** `npm run build`
- **Output / Publish directory:** `dist`
- ไฟล์ `vercel.json` และ `public/_redirects` ถูกเตรียมไว้เรียบร้อยแล้ว

---

## วิธีที่ 3: รันบน Node.js Hosting (VPS / Render / Railway / Cloud Run)

1. ติดตั้ง Dependencies และ Build หน้าเว็บ:
   ```bash
   npm install
   npm run build
   ```
2. สั่งรัน Production Server:
   ```bash
   npm start
   ```
   ระบบรองรับพอร์ตจาก Environment Variable `PORT` อัตโนมัติ (ค่าเริ่มต้นคือ `3000`)
