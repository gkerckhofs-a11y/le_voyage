/** Rendering geometry only: never modifies the exact business distances. */
export type Point = Readonly<{ x: number; y: number }>;
export type Cubic = readonly [Point, Point, Point, Point];
type Sample = Point & { length: number; segment: number; t: number };
export type Route = { id: string; width: number; height: number; curves: readonly Cubic[]; samples: readonly Sample[]; length: number; path: string };
export const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function cubicPoint(c: Cubic, t: number): Point {
  const u = 1 - t;
  return { x: u ** 3 * c[0].x + 3 * u * u * t * c[1].x + 3 * u * t * t * c[2].x + t ** 3 * c[3].x,
    y: u ** 3 * c[0].y + 3 * u * u * t * c[1].y + 3 * u * t * t * c[2].y + t ** 3 * c[3].y };
}
export function createRoute(id: string, width: number, height: number, knots: readonly Point[]): Route {
  if (knots.length < 2 || !id || ![width, height].every(n => Number.isFinite(n) && n > 0) ||
      knots.some((p, i) => !Number.isFinite(p.x + p.y) || (i > 0 && distance(p, knots[i - 1]) === 0))) throw new Error('Invalid route');
  const curves: Cubic[] = knots.slice(0, -1).map((a, i) => {
    const before = knots[Math.max(0, i - 1)], b = knots[i + 1], after = knots[Math.min(knots.length - 1, i + 2)];
    return [a, { x: a.x + (b.x - before.x) * 0.14, y: a.y + (b.y - before.y) * 0.14 },
      { x: b.x - (after.x - a.x) * 0.14, y: b.y - (after.y - a.y) * 0.14 }, b];
  });
  const samples: Sample[] = [{ ...knots[0], length: 0, segment: 0, t: 0 }];
  let length = 0;
  curves.forEach((c, segment) => {
    function sample(a: number, b: number, depth: number) {
      const p = cubicPoint(c, a), q = cubicPoint(c, b), m = cubicPoint(c, (a + b) / 2);
      const q1 = cubicPoint(c, a * .75 + b * .25), q3 = cubicPoint(c, a * .25 + b * .75);
      const polygon = distance(p, q1) + distance(q1, m) + distance(m, q3) + distance(q3, q);
      if (depth < 16 && (polygon - distance(p, q) > .025 || polygon > 20)) {
        sample(a, (a + b) / 2, depth + 1); sample((a + b) / 2, b, depth + 1);
      } else {
        length += distance(samples.at(-1)!, q);
        samples.push({ ...q, length, segment, t: b });
      }
    }
    sample(0, 1, 0);
  });
  const pair = (p: Point) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  return { id, width, height, curves, samples, length, path: `M${pair(knots[0])} ` + curves.map(c => `C${pair(c[1])} ${pair(c[2])} ${pair(c[3])}`).join(' ') };
}
export function positionAt(route: Route, ratio: number) {
  if (!Number.isFinite(ratio)) throw new Error('Invalid route ratio');
  const target = clamp(ratio, 0, 1) * route.length;
  let lo = 0, hi = route.samples.length - 1;
  while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (route.samples[mid].length < target) lo = mid + 1; else hi = mid; }
  const b = route.samples[lo], a = route.samples[Math.max(0, lo - 1)];
  const startT = a.segment === b.segment ? a.t : 0;
  const t = b.length === a.length ? b.t : startT + (b.t - startT) * (target - a.length) / (b.length - a.length);
  const c = route.curves[b.segment], p = cubicPoint(c, t), u = 1 - t;
  const dx = 3 * u * u * (c[1].x - c[0].x) + 6 * u * t * (c[2].x - c[1].x) + 3 * t * t * (c[3].x - c[2].x);
  const dy = 3 * u * u * (c[1].y - c[0].y) + 6 * u * t * (c[2].y - c[1].y) + 3 * t * t * (c[3].y - c[2].y);
  return { ...p, angle: Math.atan2(dy, dx) * 180 / Math.PI, segment: b.segment, t };
}
/** Fixed-point division before converting to a display number avoids overflow and premature rounding. */
export function distanceRatio(km: { numerator: string; denominator: string }, maximumKm: number): number {
  if (!/^\d{1,200}$/.test(km.numerator) || !/^[1-9]\d{0,199}$/.test(km.denominator) || !Number.isSafeInteger(maximumKm) || maximumKm < 1) throw new Error('Invalid distance');
  const n = BigInt(km.numerator), d = BigInt(km.denominator) * BigInt(maximumKm);
  return n >= d ? 1 : Number(n * 1_000_000_000n / d) / 1_000_000_000;
}
export function roadsideMarkers(route: Route) {
  return Array.from({ length: 58 }, (_, i) => {
    const ratio = .012 + i / 57 * .976, p = positionAt(route, ratio), a = p.angle * Math.PI / 180, side = i % 2 ? 1 : -1;
    return { number: i + 1, ratio, x: p.x - Math.sin(a) * 58 * side, y: p.y + Math.cos(a) * 58 * side };
  });
}
export function distanceFromRoute(route: Route, p: Point): number {
  let best = Infinity;
  for (let i = 1; i < route.samples.length; i++) {
    const a = route.samples[i - 1], b = route.samples[i], dx = b.x - a.x, dy = b.y - a.y;
    const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    best = Math.min(best, Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t));
  }
  return best;
}
