import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Ensure a company with the given name exists in Firestore.
 * If not, create a minimal company document (name only).
 * @param {string} companyName - Company name
 */
/** Case-insensitive lookup. Returns doc snap or null. */
export async function findCompanyByName(name) {
  const trimmed = (name || '').trim();
  const nameLower = trimmed.toLowerCase();
  // 1) Query by nameLower (สำหรับ companies ที่มี nameLower แล้ว)
  const qLower = query(collection(db, 'companies'), where('nameLower', '==', nameLower));
  const snapLower = await getDocs(qLower);
  if (!snapLower.empty) return snapLower.docs[0];
  // 2) Query exact name (สำหรับ companies เก่าที่ยังไม่มี nameLower)
  const qExact = query(collection(db, 'companies'), where('name', '==', trimmed));
  const snapExact = await getDocs(qExact);
  if (!snapExact.empty) return snapExact.docs[0];
  // 3) Fallback: fetch all แล้ว filter (กรณี DB เก่า - ชื่อ "people like people" vs ค้นหา "People Like People")
  const allSnap = await getDocs(collection(db, 'companies'));
  const found = allSnap.docs.find(d => (d.data().name || '').toLowerCase().trim() === nameLower);
  return found || null;
}

export async function ensureCompanyExists(companyName) {
  const name = (companyName || '').trim();
  if (!name || name === '__other__') return;

  const existing = await findCompanyByName(name);
  if (existing) return;

  await addDoc(collection(db, 'companies'), {
    name,
    nameLower: name.toLowerCase().trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
