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

**วิธีแก้ไขและนำขึ้น GitHub Pages อย่างถูกต้อง:**
1. Push โค้ดทั้งหมดขึ้น GitHub ที่ branch `main` (หรือ `master`) — หมายเหตุ: หากอัปโหลดแบบลากไฟล์ขึ้นหน้าเว็บ GitHub โฟลเดอร์ที่ขึ้นต้นด้วยจุดอย่าง `.github` มักถูกซ่อน/ข้าม ให้ดูวิธีสร้างบนหน้าเว็บด้านล่าง
2. เข้าไปที่หน้า GitHub Repository ของคุณ → เมนู **Settings** (ด้านบนขวาของ Repo) → เมนูซ้าย **Pages** (ใต้หมวด *Code and automation*) *(ต้องตั้งค่า Repository เป็น Public หากใช้บัญชี GitHub ฟรี)*
3. ที่หัวข้อ **Build and deployment** → ช่อง **Source** ให้คลิกเปลี่ยนจาก *Deploy from a branch* เป็น **`GitHub Actions`**
4. หากในแท็บ **Actions** ยังไม่มี Workflow ให้กด **New workflow** → **set up a workflow yourself** แล้วตั้งชื่อไฟล์ `.github/workflows/deploy.yml` พร้อมวางโค้ดด้านล่างนี้แล้วกด **Commit changes**:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main, master]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/deploy-pages@v4
```
5. รอให้แท็บ **Actions** รัน `Deploy to GitHub Pages` จนขึ้นเครื่องหมายถูกสีเขียว แล้วเปิดลิงก์เว็บไซต์ได้เลย

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
