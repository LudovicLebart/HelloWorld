interface Vec {
  x: number;
  y: number;
}

function normalize(v: Vec): Vec {
  const len = Math.hypot(v.x, v.y);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}

/**
 * Ligne centrale en spirale : part du point d'attache (0,0), s'enroule
 * vers un cœur à (hubRadius, 0). Moins d'un tour complet, pour ne jamais
 * se recouper (donc pas de risque d'auto-intersection une fois offsetée).
 */
function spiralCenterline(hubRadius: number, turns: number, steps: number): Vec[] {
  const hub: Vec = { x: hubRadius, y: 0 };
  const points: Vec[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = Math.PI - t * turns * 2 * Math.PI;
    const radius = hubRadius * (1 - t) + hubRadius * 0.05 * t;
    points.push({ x: hub.x + radius * Math.cos(theta), y: hub.y + radius * Math.sin(theta) });
  }
  return points;
}

/** Épais près du point d'attache, s'affinant vers le cœur de la volute — même principe que la tige. */
function widthProfile(t: number): number {
  return Math.max(0.02, 1 - t) ** 0.7;
}

function buildVolutePath(hubRadius = 0.45, turns = 0.85, steps = 40, maxWidth = 0.22): string {
  const centerline = spiralCenterline(hubRadius, turns, steps);
  const left: string[] = [];
  const right: string[] = [];

  for (let i = 0; i < centerline.length; i++) {
    const p = centerline[i];
    const prev = centerline[Math.max(0, i - 1)];
    const next = centerline[Math.min(centerline.length - 1, i + 1)];
    const tangent = normalize({ x: next.x - prev.x, y: next.y - prev.y });
    const normal = { x: -tangent.y, y: tangent.x };
    const halfWidth = (maxWidth * widthProfile(i / (centerline.length - 1))) / 2;
    left.push(`${p.x + normal.x * halfWidth},${p.y + normal.y * halfWidth}`);
    right.push(`${p.x - normal.x * halfWidth},${p.y - normal.y * halfWidth}`);
  }

  right.reverse();
  return `M ${left.join(" L ")} L ${right.join(" L ")} Z`;
}

export const VOLUTE_PATH_D = buildVolutePath();
