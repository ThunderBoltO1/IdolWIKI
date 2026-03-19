const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Call Gemini API with context (idols, groups) and user question
 * @param {string} userMessage - คำถามจากผู้ใช้
 * @param {object} context - { idols: [], groups: [], companies: [], chatHistory?: [{ role, text }] }
 * @returns {Promise<string>} - คำตอบจาก AI
 */
export async function askGemini(userMessage, context = {}) {
  if (!API_KEY) {
    throw new Error('Gemini API key is not configured (VITE_GEMINI_API_KEY)');
  }

  const { idols = [], groups = [], companies = [], chatHistory = [] } = context;

  const truncate = (s, max = 1500) => (s && s.length > max ? s.slice(0, max) + '...' : s || '');
  const queryLower = (userMessage || '').toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1).slice(0, 5);

  const scoreRelevance = (name, koreanName) => {
    if (!queryLower || queryWords.length === 0) return 0;
    const n = (name || '').toLowerCase();
    const k = (koreanName || '').toLowerCase();
    let score = 0;
    for (const w of queryWords) {
      if (n.includes(w) || k.includes(w)) score += 1;
    }
    return score;
  };

  const companiesSorted = [...companies].sort((a, b) => scoreRelevance(b.name, b.koreanName) - scoreRelevance(a.name, a.koreanName));
  const groupsSorted = [...groups].sort((a, b) => scoreRelevance(b.name, b.koreanName) - scoreRelevance(a.name, a.koreanName));
  const idolsSorted = [...idols].sort((a, b) => scoreRelevance(b.name, b.koreanName) - scoreRelevance(a.name, a.koreanName));

  const companiesText = companiesSorted
    .slice(0, 60)
    .map(
      (c) =>
        `[Company] name=${c.name || '-'} | foundedDate: ${c.foundedDate || '-'} | headquarters: ${c.headquarters || '-'} | founder: ${c.founder || c.founders || '-'} | ceo: ${c.ceo || '-'}\n  Description: ${truncate(c.description || '', 1800)}`
    )
    .join('\n');

  const groupsText = groupsSorted
    .slice(0, 100)
    .map(
      (g) =>
        `[Group] id=${g.id || g.name?.toLowerCase?.()?.replace(/\s+/g, '-')} | ${g.name}${g.koreanName ? ` (${g.koreanName})` : ''} | Company: ${g.company || '-'} | Debut: ${g.debutDate || '-'}\n  Biography: ${truncate(g.description || g.biography || '')}`
    )
    .join('\n');

  const idolsText = idolsSorted
    .slice(0, 150)
    .map(
      (i) =>
        `[Idol] id=${i.id || i.name?.toLowerCase?.()?.replace(/\s+/g, '-')} | ${i.name}${i.koreanName ? ` (${i.koreanName})` : ''} | Group: ${i.group || '-'} | groupId: ${i.groupId || '-'} | Company (Group): ${i.company || '-'} | Company (Solo): ${i.soloCompany || '-'} | Debut (Group): ${i.debutDate || '-'} | Debut (Solo): ${i.soloDebutDate || '-'} | Former (Group): ${(i.formerCompanies || []).map(c => typeof c === 'string' ? c : (c.duration ? `${c.company} (${c.duration})` : c.company)).join(', ') || '-'} | Former (Solo): ${(i.soloFormerCompanies || []).map(c => typeof c === 'string' ? c : (c.duration ? `${c.company} (${c.duration})` : c.company)).join(', ') || '-'} | Birth: ${i.birthDate || '-'} | Position: ${(i.positions || []).join(', ') || '-'}\n  Biography: ${truncate(i.description || i.biography || '')}`
    )
    .join('\n');

  const systemPrompt = `คุณเป็นผู้ช่วย AI สำหรับ K-Pop Wiki ที่ตอบคำถามเกี่ยวกับศิลปิน K-Pop

ลำดับการตอบ:
1. ถ้าพบข้อมูลใน context (ข้อมูลของเรา) ให้ใช้ข้อมูลนั้นตอบ และถามเชิญชวนถ้าเกี่ยวข้อง — ใส่แหล่งที่มาด้วยการต่อท้ายข้อความล่าสุดด้วย [[SOURCE:group,id,name]] หรือ [[SOURCE:idol,id,name]] (แค่ 1 อันต่อคำตอบ ใช้ของศิลปินหลักที่ตอบ) — ห้ามใส่ tag นี้กลางประโยค ระบบจะตัดออกไม่แสดงให้ผู้ใช้
2. บริษัท/สังกัด (Company): ข้อมูล Companies ด้านล่างคือหน้าค่ายในเว็บของเรา — เมื่อผู้ใช้ถามเกี่ยวกับค่าย/สังกัด (เช่น "ค่ายที่เธออยู่", "ประวัติ People Like People") ถ้าชื่อค่ายมีในรายการ Companies ให้ใช้ข้อมูลจากนั้นตอบ (Description, foundedDate, headquarters, founder, ceo) อย่าบอกว่า "ยังไม่มีข้อมูลประวัติโดยละเอียด" หรือ "ไม่มีในเว็บ" สำหรับค่ายที่มีในรายการนี้
3. ชื่อบริษัทที่ปรากฏใน Idols/Groups แต่ไม่มีในรายการ Companies ยังถือว่ามีในเว็บ (ศิลปินอยู่ค่ายนั้น) — อย่าใส่หมายเหตุ "ข้อมูลนี้ยังไม่มีในเว็บ" แต่ถ้าถามประวัติค่ายโดยเฉพาะและค่ายไม่มีในรายการ Companies ค่อยบอกว่ายังไม่มีข้อมูลละเอียดของค่ายในระบบ
4. ถ้าไม่พบใน context เลย (ทั้ง idol, group และชื่อบริษัทไม่ปรากฏใน context) ให้ใช้ความรู้ทั่วไปตอบก่อน แล้วปิดท้ายว่า "หมายเหตุ: ข้อมูลนี้ยังไม่มีในเว็บของเราค่ะ แนะนำให้ลองค้นหาในระบบอีกครั้ง" — อย่าตอบแค่ "ยังไม่มีข้อมูล" ลองหาข้อมูลจากความรู้ที่มีมาให้ก่อน

ตอบด้วยภาษาที่ผู้ใช้ถาม (ไทยหรืออังกฤษ) เป็นกันเอง และให้เนื้อหาพอสมควร — อย่าตอบแค่ประโยคเดียวถ้าคำถามเปิดโอกาสให้ขยายความได้ เช่น ถามว่า "อยู่ค่ายไหน" นอกจากบอกชื่อสังกัดแล้ว อาจบอกเพิ่มสั้น ๆ ว่าค่ายนี้มีศิลปินอื่นหรือจุดเด่นอะไร หรือเชิญชวนไปดูหน้าศิลปิน/วงในระบบ

## การจัดเรียงข้อความให้อ่านง่าย
- อย่าเริ่มต้นด้วยประโยคเชิญชวนหรือเกริ่น เช่น "มาดูประวัติของ...กันนะคะ" "แน่นอนค่ะ! มาดูข้อมูล...กันนะคะ" — ให้เริ่มตอบด้วยเนื้อหาจริงเลย (หัวข้อแล้วตามด้วยรายการขีด)
- เมื่อตอบยาว (เช่น ประวัติศิลปิน/วง/ค่าย) ให้ใช้รูปแบบ "หัวข้อ แล้วตามด้วยรายการขีด" (dash/list) เพื่อให้อ่านสแกนได้ง่าย
- รูปแบบที่ต้องใช้: ขึ้นบรรทัดใหม่ → เขียนหัวข้อ (เช่น สังกัด / ประวัติวง / วิสัยทัศน์) → ขึ้นบรรทัดใหม่ → แต่ละข้อความให้ขึ้นต้นด้วย " - " (ขีด+ช่องว่าง) แล้วตามด้วยประโยคสั้น ๆ ทีละข้อ อย่าเขียนเป็นย่อหน้าต่อกันยาว
- ตัวอย่างรูปแบบ:
  สังกัด
   - อยู่ภายใต้ YG Entertainment
   - ค่ายมีชื่อด้านฮิปฮอปและศิลปินเอกลักษณ์

  ประวัติวง
   - ก่อตั้งโดย YG เดบิวต์ 19 ส.ค. 2006
   - เดิม 5 สมาชิก ปัจจุบัน 3 สมาชิก
   - Seungri ออกจากวงปี 2019, T.O.P ยืนยันออก พ.ค. 2023
- ห้ามใช้ markdown เช่น ** แค่ขึ้นบรรทัดใหม่และใช้ " - " นำหน้าแต่ละข้อ

## การตอบคำถามประวัติ / Biography
เมื่อผู้ใช้ถามถึงประวัติ (เช่น "ขอประวัติ", "ประวัติของ...", "history of...", "biography", "ขอประวัติโดยละเอียด") ของ idol หรือ group ที่มีใน context:
- ให้ใช้รูปแบบหัวข้อ + รายการขีด (dash/list) ตาม "การจัดเรียงข้อความให้อ่านง่าย" ด้านบน: แต่ละหัวข้อ (สังกัด / ประวัติ / ฯลฯ) ตามด้วยบรรทัดที่ขึ้นต้นด้วย " - " แล้วเป็นข้อความสั้น ๆ
- เริ่มจากหัวข้อ สังกัด → ประวัติ (หรือประวัติวง/ประวัติศิลปิน) แล้วแตกรายละเอียดเป็นข้อ ๆ ใต้แต่ละหัวข้อ อย่าเขียนเป็นย่อหน้าเดียวยาว
- อย่าตอบแค่แนวเพลงหรือจุดเด่นอย่างเดียว — ต้องมีประวัติพื้นฐาน (สังกัด วันเดบิวต์) และเนื้อหา Biography ด้วย
- ถ้าผู้ใช้ถามเป็นภาษาอังกฤษ: ใช้ข้อความ Biography ตามต้นฉบับ
- ถ้าผู้ใช้ถามเป็นภาษาไทย: แปลเนื้อหา Biography เป็นภาษาไทยให้ครบถ้วน

## ความยาวและเนื้อหาของคำตอบ
- คำถามง่าย ๆ (เช่น "อยู่ค่ายไหน", "วงนี้มีใครบ้าง") ให้ตอบข้อเท็จจริงแล้วขยายความอีก 1–2 ประโยค เช่น กล่าวถึงค่าย/วงเพิ่มเล็กน้อย หรือเชิญชวนไปดูหน้าข้อมูลในระบบ — อย่าตอบแค่ประโยคเดียวแล้วจบ
- คำถามขอประวัติหรือรายละเอียด ให้ตอบครบตามข้อมูลใน context และปิดท้ายด้วยคำถามเชิญชวนเมื่อเหมาะสม

## คำถามเชิญชวน
เมื่อผู้ใช้ถามขอประวัติ ข้อมูล หรือรายละเอียดของศิลปิน/วงที่เป็นคน/วงเดียวชัดเจน ให้ปิดท้ายด้วยคำถามเชิญชวน เช่น "คุณจะไปดูหน้าเพจของ[ชื่อ]ไหมคะ" และต่อท้ายด้วย [[ASK_NAV:group,<id>]] หรือ [[ASK_NAV:idol,<id>]] (ใช้ id จริงจากข้อมูล) เพื่อให้ระบบแสดงปุ่มใช่/ไม่

## การนำทางไปหน้าต่างๆ (ใช้เท่าที่จำเป็นเท่านั้น)
ใช้ [[NAV:...]] เฉพาะเมื่อผู้ใช้ขอให้พาไป/ไปดู/นำทางไปหน้า โดยชัดเจน เช่น "พาไปหน้า ruka", "ไปหน้าวง aespa", "เปิดหน้า lisa ให้หน่อย"
ห้ามใส่ [[NAV:...]] เมื่อผู้ใช้แค่ถามข้อมูล/ประวัติ เช่น "ruka คือใคร", "ขอประวัติลิซ่า", "karina ใคร" — กรณีนี้แค่ตอบข้อมูลและถามเชิญชวนไปดูหน้า ไม่ต้อง navigate อัตโนมัติ
รูปแบบ: [[NAV:group,<groupId>]] หรือ [[NAV:idol,<idolId>]] (ใช้ id จริงจากข้อมูล) ใส่ได้แค่หนึ่งอันต่อคำตอบ

## บริบทบทสนทนา (สำคัญ)
- ผู้ใช้อาจถามต่อจากข้อความก่อนหน้า เช่น "ขอประวัติโดยละเอียด", "บอกเพิ่ม", "แล้วล่ะ" — ให้อ้างอิงจากบริบทของบทสนทนาในประวัติด้านล่าง
- ถ้าประวัติแชทระบุศิลปิน/วง (เช่น Seohyun, aespa) และผู้ใช้ถามต่อโดยไม่ระบุชื่อ — ให้ถือว่าผู้ใช้หมายถึงศิลปิน/วงนั้น

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

## ข้อมูล Companies / ค่ายในเว็บ (${companies.length} ค่าย) — ใช้ตอบคำถามเกี่ยวกับประวัติค่าย สังกัด:
${companiesText || '(ไม่มีข้อมูล)'}

## ข้อมูล Groups (${groups.length} groups):
${groupsText || '(ไม่มีข้อมูล)'}

## ข้อมูล Idols (${idols.length} idols):
${idolsText || '(ไม่มีข้อมูล)'}

${chatHistory.length > 0 ? `## ประวัติบทสนทนาล่าสุด (อ้างอิงเมื่อผู้ใช้ถามต่อ)\n${chatHistory.slice(-5).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${(m.text || '').slice(0, 250)}`).join('\n')}\n\n---` : '---'}`;

  const userPrompt = chatHistory.length > 0
    ? `คำถามล่าสุดจากผู้ใช้: ${userMessage}`
    : `คำถามจากผู้ใช้: ${userMessage}`;

  const contents = [
    { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
  ];

  const url = `${BASE}/gemini-2.5-flash:generateContent?key=${encodeURIComponent(API_KEY)}`;
  const payload = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      topP: 0.95
    }
  };

  const doFetch = async () => {
    try {
      return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      // Typical browser message is "Load failed" / "Failed to fetch"
      const msg = (err && err.message) ? err.message : String(err);
      throw new Error(`Gemini network error: ${msg}`);
    }
  };

  let res = await doFetch();
  if (!res.ok && res.status >= 500) {
    await new Promise(r => setTimeout(r, 800));
    res = await doFetch();
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    throw new Error(`Gemini response parse error: ${msg} (HTTP ${res.status})`);
  }

  if (!res.ok) {
    const apiMsg = data?.error?.message || data?.message || `HTTP ${res.status}`;
    throw new Error(`Gemini API error: ${apiMsg}`);
  }
  if (data?.error) {
    throw new Error(data.error?.message || 'Gemini API error');
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text?.trim() || 'Sorry, I couldn\'t respond at the moment.';
}
