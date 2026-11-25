# Content templates — what the Owner prepares in Google Sheets

Put each sheet in Drive `/LinguaPath/01_Content/`. Row 1 = exact column names below. IDs are permanent: never reuse or renumber them. Lists inside a cell are separated by `;`.

## Departments
| department_id | name_en | name_ar | description | skills | placement_max_items | placement_min_items | placement_target_se | status |
|---|---|---|---|---|---|---|---|---|
| GEN | General English | اللغة الإنجليزية العامة | Core skills K-12 | READ;LIST;GRAM;VOC;WRIT;SPEAK | 30 | 12 | 0.35 | active |
| MAP | MAP Growth Prep | التحضير لاختبار MAP | Reading & Language Usage | MAP_READ;MAP_LU | 30 | 15 | 0.30 | active |

## Skills
| skill_id | department_id | name_en | name_ar | blueprint_min_share | order |
|---|---|---|---|---|---|
| READ | GEN | Reading | القراءة | 0.25 | 1 |

## Questions
| item_id | department_id | skill_id | sub_skill | item_type | stem | passage_id | media_file | option_a | option_b | option_c | option_d | option_e | correct | difficulty | cefr | grade_band | tags | explanation | time_limit_sec | status | author |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GEN-GRAM-0001 | GEN | GRAM | past simple | mcq_single | Yesterday she ___ to school. | | | go | goes | went | gone | | C | 3 | A2 | 3-5 | school;daily life | "Yesterday" signals the past simple. | 60 | active | Owner |

- `item_type`: `mcq_single`, `mcq_multi`, `true_false`, `gap_fill`, `matching`, `ordering`, `short_answer`, `writing_prompt`, `speaking_prompt`.
- `correct`: letter(s) for MCQ (`C` or `A;C`); for gap_fill/short_answer, accepted answers separated by `|` (`went|had gone`).
- `difficulty`: 1 (easiest) to 10 (hardest), your best judgement. The app recalibrates it from real answers later.
- `cefr`: `PreA1, A1, A2, B1, B2, C1, C2`. `grade_band`: `K-2, 3-5, 6-8, 9-12`.
- `media_file`: exact file name in `02_Media/` (e.g., `listen_0001.mp3`).

## Passages
| passage_id | title | text | media_file | cefr | word_count | tags | source_note |
|---|---|---|---|---|---|---|---|

## Lessons
| lesson_id | department_id | skill_id | title_en | title_ar | cefr | grade_band | objectives | duration_min | format | content_link | practice_item_ids | tags | prerequisites | xp | status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L-GEN-GRAM-010 | GEN | GRAM | Talking about yesterday | الحديث عن الأمس | A2 | 3-5 | Use past simple regular & irregular verbs | 15 | interactive | past_simple_slides.pdf | GEN-GRAM-0001;GEN-GRAM-0002 | daily life;sports | L-GEN-GRAM-005 | 20 | active |

- `format`: `video`, `audio`, `reading`, `interactive`, `worksheet`, `game`, `slides`.
- `content_link`: Drive file name in `02_Media/` or a full URL (YouTube/Vimeo unlisted for big videos).

## Badges
| badge_id | name_en | name_ar | description | icon_file | rule_json | xp_bonus | status |
|---|---|---|---|---|---|---|---|
| B-STREAK-7 | Week Warrior | محارب الأسبوع | 7-day streak | streak7.svg | {"event":"streak_day","count":7} | 50 | active |

## CutScores (θ → CEFR per department)
| department_id | cefr | min_theta | max_theta |
|---|---|---|---|
| GEN | A1 | -3.0 | -1.8 |

## Users import (CSV or Sheet)
| school_code | role | username | full_name | email | grade | class | language | consent |
|---|---|---|---|---|---|---|---|---|
| RIY01 | student | sara.k | Sara K. | | 4 | 4B | ar | yes |

## Course units (JSON files, one per unit)
For courses written as whole units (Reading and Writing): put the files in Drive `/LinguaPath/01_Content/Units/` (any subfolders), or paste any Drive folder link in Owner → Content → "Course units". Each file is one unit with `id`, `strand` (e.g. `RW`), `level` (`A1`, `A1P` … `C2`; `P` is shown as `+`), `unit`, `title`, `title_ar`, `objectives`, `vocabulary`, `hook`, `passage.paragraphs`, `comprehension` (`mcq` with `options`/`answer`/`hints`, `tfng`, `short`, `sequence`), `writing_skill`, `writing_task`. Other strands use their own parts instead of a passage: `script` + `listening` + `speaking_task` (LS), `model_text.chunks` (SH), `context_text` + `grammar_lesson` + `practice` (LU; question types `cloze`, `word_formation`, `error_correction`, `transformation`). When a folder has files named `unit…json`, only those are read. Unknown fields are kept untouched. The import reports each broken file with its reason and skips unchanged ones. Format rules: `src/features/units/schema.ts`.

## Tip
You can ask Claude (with the Google Drive connector on) to draft question banks straight into these sheets, e.g. "Write 40 A2 past-simple items for grade 3-5 in the Questions template, difficulty 2–5, with explanations."

### Pictures and audio for course units
Put files in Drive `LinguaPath/02_Media` (any subfolder), named after the item's `id`, then press Import units again:
- Word picture: `<word id>.jpg` (or `.png`, `.webp`), e.g. `RW-A1-U01-VOC01.jpg`. Shown beside the definition.
- Word, chunk or line audio: `<id>.mp3`. Whole passage or script: `<passage id>.mp3`. Without a file the device voice reads it.
- Optional fields used for speaking feedback: vocabulary `syllables` ("re·fute") and `stress` ("oO"); chunk `display` (CAPITALS = stressed), `intonation` (↗ or ↘) and `word_stress`.
