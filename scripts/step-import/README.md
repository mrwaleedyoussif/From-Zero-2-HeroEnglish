# STEP pack → LinguaPath content sheets (one-off tooling)

Converts the Owner's STEP series (Drive folder `STEP/STEP 11-2026`) into the sheets in
docs/DATA_TEMPLATES.md. The content itself is the Owner's and is **not** stored in this public repo.

1. Download into one working folder (outside the repo):
   - `raw/STEP_F_Item_Register.csv` (the newest register, 8,170 rows)
   - `docx/STEP_F_B{1..4}_*_Unit*_Part{1,2}.docx` (40 files)
   - `vb_STEP_F_B2_Vocabulary_Bank_{A1,A2,B1,B2,B2plus}.docx`
2. `pip install python-docx`, then `python3 -I convert.py <folder>` → `parsed.json`
   (checks every answer against the register), then `python3 -I build_csv.py <folder>` → `out/*.csv`.
3. Result (2026-11-22): 5,110 MCQs, 161 passages, 316 audio tracks (`L-…mp3`, already in the
   STEP folder), department `STEP`, 5 skills, cut scores. B2+ is stored as CEFR C1.
4. Put the CSVs into Drive `LinguaPath/01_Content` as Google Sheets named Departments, Skills,
   CutScores, Passages, Questions; copy the 316 mp3 files into `LinguaPath/02_Media/audio`;
   then Owner → Content → Check sheets → Apply (local trial: 25 s, 0 errors).
