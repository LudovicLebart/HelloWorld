import "./style.css";
import type { Point } from "./core/types";
import { simplifyRDP } from "./core/simplify";
import { buildCurve } from "./core/spline";
import { buildStemPath } from "./core/stem";
import { placeBrush } from "./core/brush";
import { attachPointerCapture } from "./ui/pointerCapture";
import { Renderer } from "./ui/renderer";

const svg = document.querySelector<SVGSVGElement>("#canvas")!;
const renderer = new Renderer(svg);

const spacingInput = document.querySelector<HTMLInputElement>("#spacing")!;
const scaleInput = document.querySelector<HTMLInputElement>("#scale")!;
const jitterInput = document.querySelector<HTMLInputElement>("#jitter")!;
const thicknessInput = document.querySelector<HTMLInputElement>("#thickness")!;
const clearButton = document.querySelector<HTMLButtonElement>("#clear")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export")!;

const RDP_EPSILON = 2.5; // px : tolérance de simplification du tracé brut

function traceToVine(rawPoints: Point[]): void {
  if (rawPoints.length < 2) return;

  const controlPoints = simplifyRDP(rawPoints, RDP_EPSILON);
  const curve = buildCurve(controlPoints);
  if (curve.length < 2) return;

  const baseWidth = Number(thicknessInput.value);
  const stemPathD = buildStemPath(curve, baseWidth);

  const leaves = placeBrush(curve, {
    spacing: Number(spacingInput.value),
    baseScale: Number(scaleInput.value),
    jitter: Number(jitterInput.value) / 100,
  });

  renderer.addVine(stemPathD, leaves);
}

attachPointerCapture(svg, {
  onStrokeMove: (points) => renderer.setLiveStroke(points),
  onStrokeEnd: (points) => {
    renderer.setLiveStroke(null);
    traceToVine(points);
  },
});

clearButton.addEventListener("click", () => renderer.clear());

exportButton.addEventListener("click", () => {
  const svgString = renderer.exportSVG();
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `liane-${Date.now()}.svg`;
  a.click();
  URL.revokeObjectURL(url);
});
