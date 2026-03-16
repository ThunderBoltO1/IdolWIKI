import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

/**
 * Validates image file type only. Size is handled by auto-compression before upload.
 * @param {File} file The file to validate.
 * @param {number} _maxSizeMB Kept for backward compatibility; oversized files are now auto-compressed.
 * @throws {Error} If the file type is invalid.
 */
export function validateFile(file, _maxSizeMB = 5) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please select an image (JPEG, PNG, WebP, GIF).');
    }
    // Size limit removed: oversized images are auto-compressed before upload.
}

/**
 * Compresses an image and converts it to WebP format.
 * ปรับค่า default ให้รูปไม่แตก: ใช้ maxSizeMB/ความละเอียดสูงขึ้น + initialQuality
 * @param {File} file The image file to compress.
 * @param {number} maxSizeMB The target maximum size in megabytes.
 * @param {number} maxWidthOrHeight The maximum width or height of the image.
 * @param {number} initialQuality 0–1 คุณภาพเริ่มต้น (สูง = ชัดกว่า)
 * @returns {Promise<File>} The compressed WebP file.
 */
export async function compressImage(file, maxSizeMB = 1.5, maxWidthOrHeight = 2560, initialQuality = 0.92) {
  const options = {
    maxSizeMB,
    maxWidthOrHeight,
    initialQuality,
    useWebWorker: true,
    fileType: 'image/webp',
  };
  try {
    const compressedFile = await imageCompression(file, options);
    const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const webpFile = new File([compressedFile], `${originalName}.webp`, { type: 'image/webp' });
    return webpFile;
  } catch (error) {
    console.error('Image compression to WebP failed:', error);
    return file;
  }
}

/**
 * บีบอัดรูปสำหรับ Hero/Cover (แบนเนอร์ใหญ่) — คงความละเอียดสูง ไม่แปลงเป็น WebP
 * ใช้ขนาดไฟล์และความละเอียดสูงมาก + คงประเภทไฟล์เดิม (JPEG/PNG) เพื่อไม่ให้ภาพแตก
 */
export async function compressImageForHero(file) {
  const options = {
    maxSizeMB: 4,
    maxWidthOrHeight: 3840,
    initialQuality: 0.98,
    useWebWorker: true,
    // ไม่บังคับ WebP — ใช้ประเภทเดิม (image/jpeg, image/png) เพื่อความคม
    fileType: file.type || 'image/jpeg',
  };
  try {
    const compressedFile = await imageCompression(file, options);
    const name = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const ext = (file.type === 'image/png' ? '.png' : '.jpg');
    return new File([compressedFile], `${name}${ext}`, { type: compressedFile.type || file.type });
  } catch (error) {
    console.error('Hero image compression failed:', error);
    return file;
  }
}

export async function uploadImage(file, path = 'images', onProgress) {
  const storage = getStorage();
  const fileRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
  
  const uploadTask = uploadBytesResumable(fileRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => {
        console.error('Upload failed:', error);
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
}

/**
 * Extract storage path from Firebase Storage download URL
 * Format: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH_ENCODED?alt=media&token=...
 */
function getStoragePathFromUrl(url) {
    try {
        const match = url.match(/\/o\/([^?]+)/);
        if (match) return decodeURIComponent(match[1]);
    } catch (e) { /* ignore */ }
    return null;
}

export async function deleteImage(imageUrl) {
    if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) {
        return;
    }
    const storage = getStorage();
    const path = getStoragePathFromUrl(imageUrl);
    if (!path) return;
    try {
        const imageRef = ref(storage, path);
        await deleteObject(imageRef);
    } catch (error) {
        if (error.code !== 'storage/object-not-found') {
            console.error("Error deleting image:", error);
        }
    }
}

export function dataURLtoFile(dataurl, filename) {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}