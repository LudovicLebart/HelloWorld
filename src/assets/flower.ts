function fmt(n: number): string {
  return Number(n.toFixed(4)).toString();
}

function rotate(x: number, y: number, theta: number): [number, number] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [x * c - y * s, x * s + y * c];
}

/** Un pétale (même silhouette en amande que la feuille), depuis le cœur de la fleur vers l'extérieur. */
function petalPath(hubDistance: number, length: number, width: number, theta: number): string {
  const raw: Array<[number, number]> = [
    [hubDistance, 0],
    [hubDistance + length * 0.12, -width * 0.34],
    [hubDistance + length * 0.55, -width * 0.46],
    [hubDistance + length, 0],
    [hubDistance + length * 0.55, width * 0.46],
    [hubDistance + length * 0.12, width * 0.34],
  ];
  const [p0, c1, c2, mid, c3, c4] = raw.map(([x, y]) => rotate(x, y, theta));
  return (
    `M${fmt(p0[0])},${fmt(p0[1])} ` +
    `C${fmt(c1[0])},${fmt(c1[1])} ${fmt(c2[0])},${fmt(c2[1])} ${fmt(mid[0])},${fmt(mid[1])} ` +
    `C${fmt(c3[0])},${fmt(c3[1])} ${fmt(c4[0])},${fmt(c4[1])} ${fmt(p0[0])},${fmt(p0[1])} Z`
  );
}

/**
 * Rosette de pétales disposés en cercle autour d'un cœur légèrement décalé
 * du point d'attache (0,0), même convention que les autres motifs : origine
 * au point d'attache, extension nominale vers +x.
 */
function buildRosette(petalCount: number, hubDistance: number, petalLength: number, petalWidth: number): string {
  return Array.from({ length: petalCount }, (_, i) =>
    petalPath(hubDistance, petalLength, petalWidth, (i / petalCount) * Math.PI * 2),
  ).join(" ");
}

export const FLOWER_PATH_D = buildRosette(5, 0.12, 0.42, 0.24);
