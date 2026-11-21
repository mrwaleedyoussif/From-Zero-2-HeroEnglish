/**
 * Kagan-style teams (SPEC §9, §10): mixed ability, about four per team, never more than five
 * and never fewer than three when the class is big enough. Students are ranked by ability and
 * dealt out in a snake (1→k, k→1) so every team gets a similar spread.
 */
export interface Rankable {
  id: string;
  theta: number | null;
}

export function teamCount(n: number): number {
  if (n <= 0) return 0;
  const min = Math.ceil(n / 5);
  const max = Math.max(1, Math.floor(n / 3));
  return Math.min(Math.max(Math.round(n / 4), min), max);
}

export function makeTeams(students: readonly Rankable[]): string[][] {
  const k = teamCount(students.length);
  const ranked = [...students].sort(
    (a, b) => (b.theta ?? 0) - (a.theta ?? 0) || a.id.localeCompare(b.id),
  );
  const teams: string[][] = Array.from({ length: k }, () => []);
  ranked.forEach((s, i) => {
    const round = Math.floor(i / k);
    const pos = i % k;
    const team = teams[round % 2 === 0 ? pos : k - 1 - pos] as string[];
    team.push(s.id);
  });
  return teams;
}
