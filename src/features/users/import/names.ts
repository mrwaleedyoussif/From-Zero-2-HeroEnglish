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

/**
 * Spreadsheets count upwards when a cell is dragged down, so one school's code turns into
 * AB100, AB101, AB102… on the rows below. A code that is not a school, and is the code of the
 * row above plus a little, is put back to that row's school. Returns what each fixed row said.
 */
export function repairFilledCodes<R extends { school_code: string; school_name?: string }>(
  rows: R[],
  known: (code: string) => boolean,
): Map<R, string> {
  const fixed = new Map<R, string>();
  const split = (c: string) => /^(.*?)(\d+)$/.exec(c);
  let prev: { raw: string; use: string; name?: string } | undefined;
  for (const r of rows) {
    const raw = r.school_code;
    const a = prev && split(prev.raw);
    const b = split(raw);
    const step = a && b && a[1] === b[1] ? Number(b[2]) - Number(a[2]) : 0;
    const sameName =
      !r.school_name || !prev?.name || r.school_name.toLowerCase() === prev.name.toLowerCase();
    if (prev && !known(raw) && step >= 1 && step <= 5 && sameName) {
      r.school_code = prev.use;
      fixed.set(r, raw);
    }
    prev = { raw, use: r.school_code, name: r.school_name ?? prev?.name };
  }
  return fixed;
}
