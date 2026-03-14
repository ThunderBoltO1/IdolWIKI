const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Call Gemini API with context (idols, groups) and user question
 * @param {string} userMessage - คำถามจากผู้ใช้
 * @param {object} context - { idols: [], groups: [] }
 * @returns {Promise<string>} - คำตอบจาก AI
 */
export async function askGemini(userMessage, context = {}) {
  if (!API_KEY) {
    throw new Error('ไม่ได้ตั้งค่า Gemini API key (VITE_GEMINI_API_KEY)');
  }

  const { idols = [], groups = [] } = context;

  // สร้าง context ข้อมูลจาก idols และ groups (จำกัดขนาดเพื่อไม่เกิน token limit)
  const groupsText = groups
    .slice(0, 150)
    .map((g) => `[Group] id=${g.id || g.name?.toLowerCase?.()?.replace(/\s+/g, '-')} | ${g.name}${g.koreanName ? ` (${g.koreanName})` : ''} | Company: ${g.company || '-'} | Debut: ${g.debutDate || '-'}`)
    .join('\n');

  const idolsText = idols
    .slice(0, 300)
    .map(
      (i) =>
        `[Idol] id=${i.id || i.name?.toLowerCase?.()?.replace(/\s+/g, '-')} | ${i.name}${i.koreanName ? ` (${i.koreanName})` : ''} | Group: ${i.group || '-'} | groupId: ${i.groupId || '-'} | Company: ${i.company || '-'} | Birth: ${i.birthDate || '-'} | Position: ${(i.positions || []).join(', ') || '-'}`
    )
    .join('\n');

  const systemPrompt = `คุณเป็นผู้ช่วย AI สำหรับ K-Pop Wiki ที่ตอบคำถามเกี่ยวกับศิลปิน K-Pop

ลำดับการตอบ:
1. ถ้าพบข้อมูลใน context (ข้อมูลของเรา) ให้ใช้ข้อมูลนั้นตอบ และถามเชิญชวนถ้าเกี่ยวข้อง — เมื่อใช้ข้อมูลจาก context ให้ต่อท้ายด้วย [[SOURCE:group,id,name]] หรือ [[SOURCE:idol,id,name]] เพื่อระบุแหล่งที่มา
2. ถ้าไม่พบใน context ให้ใช้ความรู้ทั่วไป/ข้อมูลสาธารณะ (จากแหล่ง K-Pop ต่างๆ) ตอบก่อน แล้วปิดท้ายว่า "หมายเหตุ: ข้อมูลนี้ยังไม่มีในเว็บของเราค่ะ แนะนำให้ลองค้นหาในระบบอีกครั้ง" — อย่าตอบแค่ "ยังไม่มีข้อมูล" ลองหาข้อมูลจากความรู้ที่มีมาให้ก่อน

ตอบด้วยภาษาที่ผู้ใช้ถาม (ไทยหรืออังกฤษ) สั้น กระชับ เป็นกันเอง

## คำถามเชิญชวน
เมื่อผู้ใช้ถามขอประวัติ ข้อมูล หรือรายละเอียดของศิลปิน/วงที่เป็นคน/วงเดียวชัดเจน ให้ปิดท้ายด้วยคำถามเชิญชวน เช่น "คุณจะไปดูหน้าเพจของ[ชื่อ]ไหมคะ" และต่อท้ายด้วย [[ASK_NAV:group,<id>]] หรือ [[ASK_NAV:idol,<id>]] (ใช้ id จริงจากข้อมูล) เพื่อให้ระบบแสดงปุ่มใช่/ไม่

## การนำทางไปหน้าต่างๆ (ใช้เท่าที่จำเป็นเท่านั้น)
ใช้ [[NAV:...]] เฉพาะเมื่อผู้ใช้ขอให้พาไป/ไปดู/นำทางไปหน้า โดยชัดเจน เช่น "พาไปหน้า ruka", "ไปหน้าวง aespa", "เปิดหน้า lisa ให้หน่อย"
ห้ามใส่ [[NAV:...]] เมื่อผู้ใช้แค่ถามข้อมูล/ประวัติ เช่น "ruka คือใคร", "ขอประวัติลิซ่า", "karina ใคร" — กรณีนี้แค่ตอบข้อมูลและถามเชิญชวนไปดูหน้า ไม่ต้อง navigate อัตโนมัติ
รูปแบบ: [[NAV:group,<groupId>]] หรือ [[NAV:idol,<idolId>]] (ใช้ id จริงจากข้อมูล) ใส่ได้แค่หนึ่งอันต่อคำตอบ

## ความรู้อื่นๆ / AKA / คำศัพท์
- พิน่า (Pina) = aka ที่เหล่า MY (แฟนคลับ aespa ชาวไทย) ตั้งให้ Karina (aespa)
- MY (마이) = แฟนคลับ aespa
- BLINK = แฟนคลับ BLACKPINK
- ONCE = แฟนคลับ TWICE
- ARMY = แฟนคลับ BTS
- NCTzen = แฟนคลับ NCT
- STAY = แฟนคลับ Stray Kids
- MOA = แฟนคลับ TXT
- ENGENE = แฟนคลับ ENHYPEN

## ข้อมูล Groups (${groups.length} groups):
${groupsText || '(ไม่มีข้อมูล)'}

## ข้อมูล Idols (${idols.length} idols):
${idolsText || '(ไม่มีข้อมูล)'}`;

  const url = `${BASE}/gemini-2.5-flash:generateContent?key=${encodeURIComponent(API_KEY)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n---\nคำถามจากผู้ใช้: ${userMessage}` }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        topP: 0.95
      }
    })
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error?.message || 'Gemini API error');
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text?.trim() || 'ขออภัย ตอบไม่ได้ในขณะนี้';
}
