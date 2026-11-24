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

## วิธีที่ 2: นำขึ้น GitHub Pages (สำคัญ — แก้ปัญหาหน้าเว็บเป็นจอขาว)

**สาเหตุที่เปิดแล้วเป็นจอขาว:** หากตั้งค่า GitHub Pages เป็น `Deploy from a branch (main / root)` ระบบจะไปเปิดไฟล์ `index.html` ต้นฉบับที่ชี้ไปยัง `/src/main.tsx` ซึ่งเบราว์เซอร์ไม่สามารถรันไฟล์ TypeScript/JSX โดยตรงได้ (และโฟลเดอร์ `dist/` ไม่ได้ถูกเก็บใน Git)

**วิธีแก้ไขและนำขึ้น GitHub Pages อย่างถูกต้อง (อัปโหลดไฟล์ `.github/workflows/deploy.yml` ที่มีให้ในโปรเจกต์แล้ว):**
1. Push โค้ดทั้งหมด (รวมโฟลเดอร์ `.github/workflows/deploy.yml` และ `public/.nojekyll`) ขึ้น GitHub ที่ branch `main` (หรือ `master`)
2. เข้าไปที่หน้า GitHub Repository ของคุณ → **Settings** → **Pages**
3. ที่หัวข้อ **Build and deployment** → **Source** ให้เปลี่ยนจาก *Deploy from a branch* เป็น **`GitHub Actions`**
4. รอสักครู่ให้แท็บ **Actions** รัน `Deploy to GitHub Pages` จนขึ้นเครื่องหมายถูกสีเขียว แล้วเปิดลิงก์เว็บไซต์ได้เลย

---

## วิธีที่ 3: นำขึ้น Netlify / Vercel / Cloudflare Pages

- **Build command:** `npm run build`
- **Output / Publish directory:** `dist`
- ไฟล์ `vercel.json` และ `public/_redirects` ถูกเตรียมไว้เรียบร้อยแล้ว

---

## วิธีที่ 4: รันบน Node.js Hosting (VPS / Render / Railway / Cloud Run)

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
