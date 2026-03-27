// Confusion Matrix calculation functions

export function parseLabels(str: string): string[] {
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

export function getClasses(actual: string[], predicted: string[]): string[] {
  return [...new Set([...actual, ...predicted])].sort();
}

export function buildMatrix(actual: string[], predicted: string[], classes: string[]): number[][] {
  const idx = Object.fromEntries(classes.map((c, i) => [c, i]));
  const matrix = classes.map(() => classes.map(() => 0));
  for (let i = 0; i < actual.length; i++) {
    matrix[idx[actual[i]]][idx[predicted[i]]]++;
  }
  return matrix;
}

export interface ClassMetric {
  cls: string;
  tp: number;
  fp: number;
  fn: number;
  support: number;
  precision: number;
  recall: number;
  f1: number;
}

export function classMetrics(matrix: number[][], classes: string[]): ClassMetric[] {
  return classes.map((cls, i) => {
    const tp = matrix[i][i];
    const fp = matrix.reduce((s, row, r) => s + (r !== i ? row[i] : 0), 0);
    const fn = matrix[i].reduce((s, v, c) => s + (c !== i ? v : 0), 0);
    const support = matrix[i].reduce((a, b) => a + b, 0);
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    const f1 = precision + recall === 0 ? 0 : 2 * precision * recall / (precision + recall);
    return { cls, tp, fp, fn, support, precision, recall, f1 };
  });
}

export interface AvgMetrics {
  precision: number;
  recall: number;
  f1: number;
}

export function macroAvg(metrics: ClassMetric[]): AvgMetrics {
  const n = metrics.length;
  return {
    precision: metrics.reduce((s, m) => s + m.precision, 0) / n,
    recall: metrics.reduce((s, m) => s + m.recall, 0) / n,
    f1: metrics.reduce((s, m) => s + m.f1, 0) / n,
  };
}

export function weightedAvg(metrics: ClassMetric[]): AvgMetrics {
  const total = metrics.reduce((s, m) => s + m.support, 0);
  if (total === 0) return { precision: 0, recall: 0, f1: 0 };
  return {
    precision: metrics.reduce((s, m) => s + m.precision * m.support, 0) / total,
    recall: metrics.reduce((s, m) => s + m.recall * m.support, 0) / total,
    f1: metrics.reduce((s, m) => s + m.f1 * m.support, 0) / total,
  };
}

export function accuracy(matrix: number[][]): number {
  const correct = matrix.reduce((s, row, i) => s + row[i], 0);
  const total = matrix.reduce((s, row) => s + row.reduce((a, b) => a + b, 0), 0);
  return total === 0 ? 0 : correct / total;
}

export interface RocPoint {
  fpr: number;
  tpr: number;
}

export function rocCurve(actual: string[], predicted: string[], posClass: string): RocPoint[] {
  const binary = actual.map(a => a === posClass ? 1 : 0);
  const scores = predicted.map(p => p === posClass ? 1 : 0);
  const thresholds = [1, 0];
  const points = thresholds.map(t => {
    const tp = binary.filter((b, i) => b === 1 && scores[i] >= t).length;
    const fp = binary.filter((b, i) => b === 0 && scores[i] >= t).length;
    const fn = binary.filter((b, i) => b === 1 && scores[i] < t).length;
    const tn = binary.filter((b, i) => b === 0 && scores[i] < t).length;
    return { fpr: fp / (fp + tn || 1), tpr: tp / (tp + fn || 1) };
  });
  // Add origin and end points for complete curve
  return [{ fpr: 0, tpr: 0 }, ...points, { fpr: 1, tpr: 1 }];
}

export function auc(points: RocPoint[]): number {
  // Sort by fpr
  const sorted = [...points].sort((a, b) => a.fpr - b.fpr);
  let area = 0;
  for (let i = 1; i < sorted.length; i++) {
    area += (sorted[i].fpr - sorted[i - 1].fpr) * (sorted[i].tpr + sorted[i - 1].tpr) / 2;
  }
  return Math.abs(area);
}

export function detectClassType(classes: string[]): { type: 'binary' | 'multiclass'; count: number } {
  const isBinary = classes.length === 2 && (
    classes.every(c => ['0', '1'].includes(c)) ||
    classes.every(c => ['yes', 'no'].includes(c.toLowerCase())) ||
    classes.every(c => ['true', 'false'].includes(c.toLowerCase()))
  );
  return { type: isBinary ? 'binary' : 'multiclass', count: classes.length };
}
