/** Helpers for the simple users file: role names as people write them, usernames, grades. */
const ROLES: Record<string, string> = {
  student: "student",
  pupil: "student",
  learner: "student",
  طالب: "student",
  طالبة: "student",
  teacher: "teacher",
  معلم: "teacher",
  معلمة: "teacher",
  coach: "coach",
  مدرب: "coach",
  مشرف: "coach",
  principal: "principal",
  مدير: "principal",
  vp: "vp",
  vice_principal: "vp",
  وكيل: "vp",
  academic_vp: "academic_vp",
  academic_vice_principal: "academic_vp",
  وكيل_أكاديمي: "academic_vp",
};

/** "Vice Principal", "vice-principal", "وكيل" → the role's key. Unknown names pass through. */
export function roleKey(written: string): string {
  const k = written
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return ROLES[k] ?? k;
}

const ARABIC: Record<string, string> = {
  ا: "a",
  أ: "a",
  إ: "i",
  آ: "a",
  ب: "b",
  ت: "t",
  ث: "th",
  ج: "j",
  ح: "h",
  خ: "kh",
  د: "d",
  ذ: "th",
  ر: "r",
  ز: "z",
  س: "s",
  ش: "sh",
  ص: "s",
  ض: "d",
  ط: "t",
  ظ: "z",
  ع: "a",
  غ: "gh",
  ف: "f",
  ق: "q",
  ك: "k",
  ل: "l",
  م: "m",
  ن: "n",
  ه: "h",
  ة: "a",
  و: "w",
  ي: "y",
  ى: "a",
  ئ: "y",
  ؤ: "w",
  ء: "",
};

/**
 * A username from a full name: first name, a dot and the first letter of the last name
 * ("Sara Khalid" → sara.k), in Latin letters. A number is added when it is taken.
 */
export function usernameFor(fullName: string, taken: (username: string) => boolean): string {
  const latin = [...fullName]
    .map((c) => ARABIC[c] ?? c)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  const parts = latin.split(/[^a-z0-9]+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1) ?? "") : "";
  let base = (last ? `${first}.${last[0]}` : first).slice(0, 24);
  if (base.length < 2) base = "user";
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}${n}`;
    if (!taken(candidate)) return candidate;
  }
}

/** The grade a class belongs to, read from its code: "4B" → 4, "10-A" → 10, "KG1A" → KG1. */
export function gradeOfClass(classCode: string): string | undefined {
  return /^(KG\d|\d{1,2})/i.exec(classCode.trim())?.[1]?.toUpperCase();
}

/** The school year that contains a day: September to August. */
export function schoolYear(today = new Date()) {
  const y = today.getUTCMonth() >= 7 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
  return { name: `${y}-${y + 1}`, starts_on: `${y}-09-01`, ends_on: `${y + 1}-08-31` };
}
