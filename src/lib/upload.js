// src/lib/upload.js
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

/**
 * อัปโหลดรูปภาพไปยัง Firebase Storage
 * @param {File} file - ไฟล์รูปภาพ
 * @param {string} folder - โฟลเดอร์ปลายทาง (เช่น 'idols', 'groups')
 * @param {function} onProgress - (Optional) ฟังก์ชัน callback รับค่า progress (0-100)
 * @returns {Promise<string>} - URL ของรูปภาพ
 */
export const uploadImage = (file, folder = 'uploads', onProgress) => {
    return new Promise((resolve, reject) => {
        if (!file) return resolve(null);

        // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
        const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storageRef = ref(storage, `${folder}/${filename}`);
        
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) onProgress(progress);
            }, 
            (error) => {
                console.error("Error uploading image:", error);
                reject(error);
            }, 
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
};

/**
 * ลบรูปภาพออกจาก Firebase Storage
 * @param {string} url - URL ของรูปภาพที่ต้องการลบ
 */
export const deleteImage = async (url) => {
    if (!url || !url.includes('firebasestorage')) return; // ลบเฉพาะรูปที่อยู่ใน Firebase
    try {
        const imageRef = ref(storage, url);
        await deleteObject(imageRef);
    } catch (error) {
        console.error("Error deleting image:", error);
    }
};

/**
 * ตรวจสอบขนาดไฟล์
 * @param {File} file - ไฟล์ที่ต้องการตรวจสอบ
 * @param {number} maxSizeMB - ขนาดสูงสุดที่ยอมรับ (MB)
 */
export const validateFile = (file, maxSizeMB = 5) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`File size exceeds ${maxSizeMB}MB`);
    }
    return true;
};

/**
 * บีบอัดรูปภาพก่อนอัปโหลด (Resize & Compress)
 * @param {File} file - ไฟล์รูปภาพต้นฉบับ
 * @param {number} maxWidth - ความกว้างสูงสุด (px)
 * @param {number} quality - คุณภาพ (0.0 - 1.0)
 * @returns {Promise<File>} - ไฟล์ที่บีบอัดแล้ว
 */
export const compressImage = (file, maxWidth = 1600, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            return resolve(file); // ถ้าไม่ใช่รูป ให้คืนค่าเดิม
        }
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;

        img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // คำนวณขนาดใหม่ถ้ารูปใหญ่เกินไป
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Canvas is empty'));
                        return;
                    }
                    const newFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(newFile);
                }, 'image/jpeg', quality);
        };
        img.onerror = (error) => {
            URL.revokeObjectURL(objectUrl);
            reject(error);
        };
    });
};

/**
 * แปลง Data URL (Base64) เป็น File Object
 * @param {string} dataurl - Base64 string
 * @param {string} filename - ชื่อไฟล์
 * @returns {File}
 */
export const dataURLtoFile = (dataurl, filename) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};
