import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

/**
 * Validates a file based on type and size.
 * @param {File} file The file to validate.
 * @param {number} maxSizeMB The maximum size in megabytes.
 * @throws {Error} If the file is invalid.
 */
export function validateFile(file, maxSizeMB = 5) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please select an image (JPEG, PNG, WebP, GIF).');
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`File size exceeds ${maxSizeMB}MB.`);
    }
}

/**
 * Compresses an image and converts it to WebP format.
 * @param {File} file The image file to compress.
 * @param {number} maxSizeMB The target maximum size in megabytes.
 * @param {number} maxWidthOrHeight The maximum width or height of the image.
 * @returns {Promise<File>} The compressed WebP file.
 */
export async function compressImage(file, maxSizeMB = 0.8, maxWidthOrHeight = 1920) {
  const options = {
    maxSizeMB: maxSizeMB,
    maxWidthOrHeight: maxWidthOrHeight,
    useWebWorker: true,
    fileType: 'image/webp', // Convert to WebP
  };
  try {
    const compressedFile = await imageCompression(file, options);
    const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const webpFile = new File([compressedFile], `${originalName}.webp`, { type: 'image/webp' });
    return webpFile;
  } catch (error) {
    console.error('Image compression to WebP failed:', error);
    // Fallback to original file if compression fails
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

export async function deleteImage(imageUrl) {
    if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) {
        return;
    }
    const storage = getStorage();
    try {
        const imageRef = ref(storage, imageUrl);
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