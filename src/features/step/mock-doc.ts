import type { StepMock } from "./mock";

/** A mock read from its Word file → the document the app saves (features/mocks/schema.ts). */
export function mockToDoc(mock: StepMock) {
  return {
    id: mock.id,
    number: mock.number,
    set: mock.set,
    title: mock.title,
    band: mock.band,
    guide: mock.guide,
    sections: mock.sections.map((s) => ({
      n: s.n,
      name: s.name,
      minutes: s.minutes,
      groups: s.groups.map((g, gi) => ({
        id: `${mock.id}-S${s.n}-G${gi + 1}`,
        title: g.title,
        text: g.text?.paragraphs.length ? g.text : undefined,
        track: g.track,
        script: g.script?.length ? g.script : undefined,
        questions: g.questions
          .filter((q) => q.key)
          .map((q) => ({
            id: `${mock.id}-Q${String(q.n).padStart(3, "0")}`,
            n: q.n,
            stem: q.stem,
            options: q.options,
            answer: q.key?.answer ?? "a",
            explanation: q.key ? { en: q.key.en, ar: q.key.ar } : undefined,
          })),
      })),
    })),
  };
}
