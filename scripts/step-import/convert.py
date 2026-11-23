"""Convert STEP unit Word files + item register into LinguaPath Questions/Passages CSVs.
Usage: python3 -I convert.py <step_dir>"""
import csv, glob, json, re, sys
import docx

D = sys.argv[1]
BOOK = {"VB": ("VB", "STEP_VOC"), "B1": ("G", "STEP_STRUCT"), "B2": ("R", "STEP_READ"), "B3": ("L", "STEP_LIST"), "B4": ("C", "STEP_CA")}
LEVEL_FILE = {"A1": "A1", "A2": "A2", "B1": "B1", "B2": "B2", "B2plus": "B2+"}
QUIZ = re.compile(r"^Lesson (\d+\.\d+) Quiz — \d+ Questions$")
REVIEW = re.compile(r"^(?:Unit \d+ Review — \d+ Questions|Vocabulary Practice — Level \S+ \(\d+ Questions\))$")
KEY = re.compile(r"^(?:Lesson (\d+\.\d+) Quiz|Unit \d+ Review|Vocabulary Practice \S+) — Answer Key$")
ITEM = re.compile(r"^(\d+)\.\t(.*)$")
OPT_START = re.compile(r"^A\.\s")
OPTS = re.compile(r"(?:^|\t)([A-D])\.\s+(.*?)(?=\t[A-D]\.\s|$)")
TEXT = re.compile(r"^Text (\d+) \(Questions? (\d+)[–-](\d+)\):\s*(.*)$")
REC = re.compile(r"Recording \d+.*?Questions? (\d+)[–-](\d+).*?(?:Track|\[)\s*(L-[A-Z0-9+plus]+-[A-Z0-9.]+-\d+)")
KEYLINE = re.compile(r"^(\d+)\.\s+([A-D])\s+[—-]\s+(.*)$")
STOP = re.compile(r"^(Answer Keys|Classroom Corner|Teacher|Lesson \d+\.\d+ —|Unit \d+ Review Game|Part \d+ of)")


def section_id(name):
    v = re.match(r"vb_STEP_F_B2_Vocabulary_Bank_(\w+)\.docx", name)
    if v:
        return "VB", "0", LEVEL_FILE[v.group(1)]
    m = re.match(r"STEP_F_(B\d)_\w+?_Unit(\d)_(A1|A2|B1|B2plus|B2)_Part\d", name)
    return m.group(1), m.group(2), LEVEL_FILE[m.group(3)]


def parse(path):
    book, unit, level = section_id(path.rsplit("/", 1)[1])
    paras = [p.text.strip("‏ ") for p in docx.Document(path).paragraphs]
    items, keys, passages = {}, {}, {}
    sec = None  # current quiz: lesson code or "UR"
    mode = None
    cur = None
    context = {}  # question number -> passage id or media
    for t in paras:
        if not t:
            continue
        m = QUIZ.match(t)
        if m or REVIEW.match(t):
            sec, mode, cur, context = (m.group(1) if m else "UR"), "quiz", None, {}
            continue
        m = KEY.match(t)
        if m:
            sec, mode, cur = (m.group(1) or "UR"), "key", None
            continue
        if mode == "quiz" and STOP.match(t):
            mode, cur = None, None
            continue
        if mode == "key":
            km = KEYLINE.match(t)
            if km:
                keys[(sec, int(km.group(1)))] = (km.group(2), km.group(3))
            elif STOP.match(t) and not t.startswith("Answer Keys"):
                mode = None
            continue
        if mode != "quiz":
            continue
        tm = TEXT.match(t)
        if tm:
            pid = f"P-STEP-{BOOK[book][0]}-{level.replace('+', 'plus')}-{sec.replace('.', '_')}-T{tm.group(1)}"
            passages[pid] = {"title": tm.group(4), "paras": [], "level": level}
            for n in range(int(tm.group(2)), int(tm.group(3)) + 1):
                context[n] = ("passage", pid)
            cur = ("passage", pid)
            continue
        rm = REC.search(t)
        if rm:
            media = rm.group(3).replace("B2+", "B2plus") + ".mp3"
            for n in range(int(rm.group(1)), int(rm.group(2)) + 1):
                context[n] = ("media", media)
            cur = None
            continue
        im = ITEM.match(t)
        if im:
            n = int(im.group(1))
            cur = ("item", (sec, n))
            items[(sec, n)] = {"stem": [im.group(2)], "opts": {}, "ctx": context.get(n)}
            continue
        if cur and cur[0] == "passage":
            if re.match(r"^\(\d+ words\)$", t):
                continue
            passages[cur[1]]["paras"].append(t)
            continue
        if cur and cur[0] == "item":
            it = items[cur[1]]
            if OPT_START.match(t) or (it["opts"] and re.match(r"^[B-D]\.\s", t)):
                for letter, text in OPTS.findall(t):
                    it["opts"][letter] = text.strip()
            elif not it["opts"]:
                it["stem"].append(t)
    return book, level, items, keys, passages


def main():
    reg = {r["item_id"]: r for r in csv.DictReader(open(f"{D}/raw/STEP_F_Item_Register.csv"))}
    questions, all_passages, problems = [], {}, []
    for f in sorted(glob.glob(f"{D}/docx/*.docx") + glob.glob(f"{D}/vb_*.docx")):
        book, level, items, keys, passages = parse(f)
        prefix, skill = BOOK[book]
        all_passages.update(passages)
        for (sec, n), it in items.items():
            rid = f"VB-{level}-Q{n:02d}" if book == "VB" else f"{prefix}-{level}-{sec}-Q{n:02d}"
            r = reg.get(rid)
            key = keys.get((sec, n))
            if not r or not key or len(it["opts"]) != 4:
                problems.append((rid, bool(r), bool(key), len(it["opts"])))
                continue
            if key[0] != r["correct_letter"]:
                problems.append((rid, "key mismatch", key[0], r["correct_letter"]))
                continue
            questions.append((rid, r, skill, level, sec, it, key))
    print("parsed", len(questions), "problems", len(problems))
    for p in problems[:15]:
        print("  ", p)
    json.dump(
        {"questions": [[q[0], q[2], q[3], q[4], q[5], q[6], q[1]["item_type"], q[1]["skill_tag"]] for q in questions],
         "passages": all_passages, "problems": problems},
        open(f"{D}/parsed.json", "w"), ensure_ascii=False)


main()
