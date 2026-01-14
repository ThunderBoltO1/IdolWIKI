## IdolWIKI

แอป React + Vite สำหรับจัดการฐานข้อมูล Idol / Group แบบเชื่อมต่อ Firebase Firestore และ Auth

### การรันโปรเจกต์

- **ติดตั้ง dependencies**
  - `npm install`
- **รันโหมดพัฒนา**
  - `npm run dev`
- **รัน build production**
  - `npm run build`

### การตั้งค่า Firebase (สำคัญ)

- สร้างโปรเจกต์ใน Firebase Console และเปิดใช้:
  - Authentication (Email/Password)
  - Firestore Database
  - Storage (ถ้าต้องการเก็บรูปเอง)
- แก้ค่าคอนฟิกใน `src/lib/firebase.js` ให้ตรงกับโปรเจกต์ของคุณ
- สร้าง collection ตามที่แอปใช้:
  - `users` – โปรไฟล์ผู้ใช้ (field หลัก: `name`, `username`, `email`, `role`, `avatar`, `bio`)
  - `usernames` – map `username` → `email`, `uid`
  - `groups` – ข้อมูลเกิร์ลกรุ๊ป/บอยแบนด์ (field หลัก: `name`, `koreanName`, `company`, `debutDate`, `fanclub`, `image`, `gallery`, `members`, `albums`, `awards`, `themeSongUrl`, `favoritedBy`)
  - `idols` – ข้อมูลสมาชิก/ศิลปิน (field หลัก: `name`, `koreanName`, `fullEnglishName`, `group`, `groupId`, `positions`, `company`, `nationality`, `birthDate`, `debutDate`, `height`, `bloodType`, `birthPlace`, `otherNames`, `image`, `gallery`, `instagram`, `likes`, `albums`, `awards`, `favoritedBy`)
  - `comments` – คอมเมนต์ต่อทั้ง group / idol (ใช้ `targetId`, `targetType`, `parentId`, `userId`, `user`, `avatar`, `text`, `createdAt`, `likes`, `likedBy`)
  - `notifications` – แจ้งเตือน mention (@username) (field หลัก: `recipientId`, `senderId`, `senderName`, `senderAvatar`, `type`, `targetId`, `targetType`, `targetName`, `commentId`, `text`, `createdAt`, `read`)

### หมายเหตุเรื่องรูปภาพ / Google Drive

- แอปใช้ฟังก์ชัน `convertDriveLink` ใน `src/lib/storage.js` เพื่อแปลงลิงก์ Google Drive ให้แสดงผลเป็นรูป
- รองรับลิงก์รูปแบบ:
  - `https://drive.google.com/file/d/FILE_ID/view?...`
  - `https://drive.google.com/uc?id=FILE_ID...`
- ถ้าใช้ลิงก์เว็บฝากรูปอื่น ๆ (เช่น `https://images.unsplash.com/...`) แอปจะแสดงได้ทันทีไม่ต้องแปลง
