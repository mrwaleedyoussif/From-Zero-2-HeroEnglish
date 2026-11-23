"""parsed.json → LinguaPath content CSVs in out/ (docs/DATA_TEMPLATES.md columns)."""
import csv, json, os, re, sys

D = sys.argv[1]
OUT = f"{D}/out"
os.makedirs(OUT, exist_ok=True)
data = json.load(open(f"{D}/parsed.json"))

CEFR = {"A1": "A1", "A2": "A2", "B1": "B1", "B2": "B2", "B2+": "C1"}
BASE = {"A1": 1, "A2": 3, "B1": 5, "B2": 7, "B2+": 9}
TIME = {"STEP_READ": 90, "STEP_LIST": 75, "STEP_CA": 75, "STEP_STRUCT": 45, "STEP_VOC": 45}


def write(name, cols, rows):
    with open(f"{OUT}/{name}.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(cols)
        w.writerows([[r.get(c, "") for c in cols] for r in rows])
    print(name, len(rows))


write(
    "Departments",
    ["department_id", "name_en", "name_ar", "description", "skills", "placement_max_items",
     "placement_min_items", "placement_target_se", "status"],
    [{"department_id": "STEP", "name_en": "STEP Preparation", "name_ar": "التحضير لاختبار STEP",
      "description": "Qiyas STEP: structure, reading, listening, compositional analysis, vocabulary",
      "skills": "STEP_READ;STEP_STRUCT;STEP_LIST;STEP_CA;STEP_VOC", "placement_max_items": 30,
      "placement_min_items": 15, "placement_target_se": 0.3, "status": "active"}],
)
skills = [
    ("STEP_READ", "Reading Comprehension", "فهم المقروء", 0.3),
    ("STEP_STRUCT", "Structure (Grammar)", "التراكيب النحوية", 0.25),
    ("STEP_LIST", "Listening Comprehension", "فهم المسموع", 0.2),
    ("STEP_CA", "Compositional Analysis", "التحليل الكتابي", 0.1),
    ("STEP_VOC", "Vocabulary", "المفردات", 0.05),
]
write("Skills", ["skill_id", "department_id", "name_en", "name_ar", "blueprint_min_share", "order"],
      [{"skill_id": s, "department_id": "STEP", "name_en": en, "name_ar": ar,
        "blueprint_min_share": share, "order": i + 1} for i, (s, en, ar, share) in enumerate(skills)])
write("CutScores", ["department_id", "cefr", "min_theta", "max_theta"],
      [{"department_id": "STEP", "cefr": c, "min_theta": lo, "max_theta": hi} for c, lo, hi in
       [("PreA1", -4.0, -3.0), ("A1", -3.0, -1.8), ("A2", -1.8, -0.6), ("B1", -0.6, 0.6),
        ("B2", 0.6, 1.8), ("C1", 1.8, 4.0)]])

passages = []
for pid, p in sorted(data["passages"].items()):
    text = "\n\n".join(p["paras"])
    passages.append({"passage_id": pid, "title": p["title"], "text": text, "cefr": CEFR[p["level"]],
                     "word_count": len(re.findall(r"\S+", text)), "tags": "STEP",
                     "source_note": "STEP series (Owner), Booklet 2 Reading"})
write("Passages", ["passage_id", "title", "text", "media_file", "cefr", "word_count", "tags", "source_note"],
      passages)


def difficulty(level, sec):
    """Level band (2 steps per CEFR level); later lessons and the unit review take the upper step."""
    if sec in ("UR", "VB"):
        return BASE[level] + 1
    n = int(sec.split(".")[1])
    return BASE[level] + (1 if n >= 5 else 0)


rows = []
for item_id, skill, level, sec, it, key, item_type, tag in data["questions"]:
    ctx = it["ctx"] or [None, None]
    rows.append({
        "item_id": "STEP-" + item_id.replace("+", "plus"),
        "department_id": "STEP", "skill_id": skill,
        "sub_skill": re.sub(r"^VB:", "", tag)[:200], "item_type": "mcq_single",
        "stem": "\n".join(it["stem"]),
        "passage_id": ctx[1] if ctx[0] == "passage" else "",
        "media_file": ctx[1] if ctx[0] == "media" else "",
        "option_a": it["opts"]["A"], "option_b": it["opts"]["B"],
        "option_c": it["opts"]["C"], "option_d": it["opts"]["D"],
        "correct": key[0], "difficulty": difficulty(level, sec), "cefr": CEFR[level],
        "tags": f"STEP;{item_type};lesson {sec}", "explanation": key[1],
        "time_limit_sec": TIME[skill], "status": "active", "author": "STEP series",
    })
write("Questions", ["item_id", "department_id", "skill_id", "sub_skill", "item_type", "stem",
                    "passage_id", "media_file", "option_a", "option_b", "option_c", "option_d",
                    "option_e", "correct", "difficulty", "cefr", "grade_band", "tags",
                    "explanation", "time_limit_sec", "status", "author"], rows)
