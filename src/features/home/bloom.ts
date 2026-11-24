/**
 * The opening animation: points of light travel along flower curves and leave dotted trails,
 * red first, then white over it, until a full bloom stands (about ten seconds).
 * Everything is worked out once as a list of dots with the moment each appears.
 */
export interface Dot {
  x: number; // -1..1 from the centre
  y: number;
  at: number; // seconds after the start
  white: boolean;
  size: number;
}

export const BLOOM_SECONDS = 10;
const TAU = Math.PI * 2;

/** Dots along r(θ) for θ in [from, to], appearing one after another between start and end. */
function trace(
  r: (theta: number) => number,
  [from, to]: [number, number],
  count: number,
  [start, end]: [number, number],
  look: { white?: boolean; size?: number; twist?: number },
): Dot[] {
  return Array.from({ length: count }, (_, i) => {
    const k = i / (count - 1);
    const theta = from + (to - from) * k;
    const radius = r(theta);
    const angle = theta + (look.twist ?? 0);
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
      at: start + (end - start) * k,
      white: look.white ?? false,
      size: look.size ?? 1,
    };
  });
}

export function bloomDots(): Dot[] {
  const dots: Dot[] = [];
  // 1. Six long petals, each drawn by its own point of light.
  for (let p = 0; p < 6; p++) {
    const turn = (p * TAU) / 6;
    dots.push(
      ...trace((t) => 0.98 * Math.sin(t), [0, Math.PI], 90, [0.1 + p * 0.08, 2.2 + p * 0.08], {
        twist: turn - Math.PI / 2,
        size: 1.3,
      }).map((d) => {
        // Squeeze the circle into a petal lying along its own direction.
        const along = d.x * Math.cos(turn) + d.y * Math.sin(turn);
        const across = -d.x * Math.sin(turn) + d.y * Math.cos(turn);
        const x = along * Math.cos(turn) - across * 0.42 * Math.sin(turn);
        const y = along * Math.sin(turn) + across * 0.42 * Math.cos(turn);
        return { ...d, x, y };
      }),
    );
  }
  // 2. The heart: rings of a twelve-petal rose, each a little larger and turned further.
  for (let ring = 0; ring < 14; ring++) {
    const scale = 0.08 + ring * 0.036;
    dots.push(
      ...trace(
        (t) => scale * (0.62 + 0.38 * Math.abs(Math.cos(6 * t))),
        [0, TAU],
        120 + ring * 16,
        [1.6 + ring * 0.2, 2.6 + ring * 0.2],
        { twist: ring * 0.11 },
      ),
    );
  }
  // 3. The frilled outer petals.
  for (let ring = 0; ring < 4; ring++) {
    dots.push(
      ...trace(
        (t) => 0.66 + ring * 0.075 + 0.11 * Math.cos(12 * t) + 0.025 * Math.sin(36 * t),
        [0, TAU],
        380,
        [4.4 + ring * 0.45, 6.2 + ring * 0.45],
        { twist: ring * 0.09 },
      ),
    );
  }
  // 4. White light over it all: orbits first, then the petals turn pale from the outside in.
  for (let p = 0; p < 6; p++) {
    dots.push(
      ...trace(
        (t) => 0.5 + 0.46 * Math.abs(Math.sin(1.5 * t)),
        [0, TAU],
        150,
        [6 + p * 0.12, 8 + p * 0.12],
        { white: true, twist: (p * TAU) / 12, size: 1.2 },
      ),
    );
  }
  for (let ring = 0; ring < 9; ring++) {
    const scale = 0.94 - ring * 0.085;
    dots.push(
      ...trace(
        (t) => scale * (0.8 + 0.2 * Math.cos(12 * t)),
        [0, TAU],
        260 - ring * 14,
        [7.2 + ring * 0.25, 8.6 + ring * 0.25],
        { white: true, twist: 0.13 + ring * 0.1, size: 0.9 },
      ),
    );
  }
  return dots.sort((a, b) => a.at - b.at);
}
