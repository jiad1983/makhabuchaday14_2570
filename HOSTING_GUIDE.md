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

## วิธีที่ 2: เชื่อมต่อ Git บน Plesk กับ GitHub (แนะนำสำหรับโฮสต์ Plesk)

สามารถเลือกใช้ได้ **2 รูปแบบ** ตามความพร้อมของเซิร์ฟเวอร์ Plesk:

### แบบที่ A: โฮสต์ Plesk ไม่มี Node.js หรือต้องการดึงไฟล์พร้อมแสดงผลทันที (แนะนำที่สุด)
โปรเจกต์ได้เตรียม GitHub Actions (`.github/workflows/plesk-deploy.yml`) ไว้ให้แล้ว เมื่อคุณ Push โค้ดขึ้น branch `main` (หรือ `master`) GitHub จะ Build โฟลเดอร์ `dist/` และส่งไฟล์พร้อมใช้งานไปยัง branch ชื่อ **`plesk-deploy`** ให้อัตโนมัติ

1. Push โค้ดทั้งหมดขึ้น GitHub (`main` หรือ `master`) แล้วรอให้แท็บ **Actions** รัน `Build Plesk Deploy Branch` สำเร็จ (สีเขียว)
2. ในหน้า **Plesk → Websites & Domains → Git**:
   - เลือก **Remote Git hosting (GitHub)** แล้วใส่ลิงก์ Repository
   - ช่อง **Branch** ให้เลือกเป็น **`plesk-deploy`**
   - ช่อง **Deployment path** ใช้ค่าเริ่มต้น `/httpdocs` ได้ทันที
   - กด **OK / Pull Updates** เว็บไซต์จะแสดงผลได้ทันทีโดยไม่ต้องติดตั้ง Node.js บน Plesk

### แบบที่ B: โฮสต์ Plesk ใช้โหมด Node.js (แนะนำสำหรับเก็บไฟล์ภาพและข้อมูลบนเซิร์ฟเวอร์จริง)
1. ในหน้า **Plesk → Websites & Domains → Node.js** ให้ตั้งค่าดังนี้:
   - **Document Root**: ตั้งเป็นโฟลเดอร์ย่อย **`/httpdocs/public`** (ตามที่ Plesk แนะนำเพื่อความปลอดภัย ไม่ควรชี้ไปที่ `/httpdocs` ตรงๆ)
   - **Application Root**: **`/httpdocs`**
   - **Node.js Version**: เลือก **Node.js 18.x / 20.x / 22.x**
   - **Application Startup File**: **`app.cjs`** (หรือ **`server.cjs`**) — ห้ามใช้ไฟล์ที่โหลดแบบ Async เพราะ Phusion Passenger จะแจ้ง `The application started, then exited.`
2. กดปุ่ม **NPM install** ในหน้า Node.js ของ Plesk จากนั้นสั่ง Build หน้าเว็บด้วยปุ่ม **Run script** → ใส่คำสั่ง `build` (หรือรัน `npm run build` ผ่าน SSH/Git deployment) เพื่อให้ได้ `dist/` และ `server.cjs`
3. กด **Restart App** เว็บไซต์และระบบอัปโหลดภาพ/ฐานข้อมูลจะทำงานได้สมบูรณ์โดยไม่มีคำเตือนเรื่อง Document Root

---

## วิธีที่ 3: นำขึ้น GitHub Pages (สำคัญ — แก้ปัญหาหน้าเว็บเป็นจอขาว)

**สาเหตุที่เปิดแล้วเป็นจอขาว:** หากตั้งค่า GitHub Pages เป็น `Deploy from a branch (main / root)` ระบบจะไปเปิดไฟล์ `index.html` ต้นฉบับที่ชี้ไปยัง `/src/main.tsx` ซึ่งเบราว์เซอร์ไม่สามารถรันไฟล์ TypeScript/JSX โดยตรงได้ (และโฟลเดอร์ `dist/` ไม่ได้ถูกเก็บใน Git)

**วิธีแก้ไขและนำขึ้น GitHub Pages อย่างถูกต้อง (อัปโหลดไฟล์ `.github/workflows/deploy.yml` ที่มีให้ในโปรเจกต์แล้ว):**
1. Push โค้ดทั้งหมด (รวมโฟลเดอร์ `.github/workflows/deploy.yml` และ `public/.nojekyll`) ขึ้น GitHub ที่ branch `main` (หรือ `master`)
2. เข้าไปที่หน้า GitHub Repository ของคุณ → **Settings** → **Pages**
3. ที่หัวข้อ **Build and deployment** → **Source** ให้เปลี่ยนจาก *Deploy from a branch* เป็น **`GitHub Actions`**
4. รอสักครู่ให้แท็บ **Actions** รัน `Deploy to GitHub Pages` จนขึ้นเครื่องหมายถูกสีเขียว แล้วเปิดลิงก์เว็บไซต์ได้เลย

---

## วิธีที่ 4: นำขึ้น Netlify / Vercel / Cloudflare Pages

- **Build command:** `npm run build`
- **Output / Publish directory:** `dist`
- ไฟล์ `vercel.json` และ `public/_redirects` ถูกเตรียมไว้เรียบร้อยแล้ว

---

## วิธีที่ 5: รันบน Node.js Hosting (VPS / Render / Railway / Cloud Run)

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
