export interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
}

export interface CorrelationResult {
  r: number;
  rSquared: number;
  pValue: number;
  n: number;
}

export function mean(values: number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function standardDeviation(values: number[]): number {
  if (values.length === 0) return NaN;
  const m = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function linearRegression(
  xs: number[],
  ys: number[]
): RegressionResult {
  if (xs.length !== ys.length) {
    throw new Error("xs and ys must have the same length");
  }
  if (xs.length < 2) {
    throw new Error("At least 2 points are required for linear regression");
  }

  const n = xs.length;
  const xMean = mean(xs);
  const yMean = mean(ys);

  let ssXY = 0;
  let ssXX = 0;
  for (let i = 0; i < n; i++) {
    ssXY += (xs[i] - xMean) * (ys[i] - yMean);
    ssXX += (xs[i] - xMean) ** 2;
  }

  const slope = ssXX === 0 ? 0 : ssXY / ssXX;
  const intercept = yMean - slope * xMean;

  // Calculate rSquared
  const ssTotal = ys.reduce((sum, y) => sum + (y - yMean) ** 2, 0);
  if (ssTotal === 0) {
    return { slope, intercept, rSquared: NaN };
  }

  const ssResidual = ys.reduce((sum, y, i) => {
    const predicted = slope * xs[i] + intercept;
    return sum + (y - predicted) ** 2;
  }, 0);

  const rSquared = 1 - ssResidual / ssTotal;

  return { slope, intercept, rSquared };
}

function approximatePValue(t: number, df: number): number {
  const criticalValues: [number, number][] = [
    [0.001, 3.291 + 10 / df],
    [0.01, 2.576 + 4 / df],
    [0.05, 1.96 + 2 / df],
  ];
  for (const [p, critical] of criticalValues) {
    if (t >= critical) return p;
  }
  return 1.0;
}

export function pearsonCorrelation(
  xs: number[],
  ys: number[]
): CorrelationResult {
  if (xs.length < 3 || ys.length < 3) {
    throw new Error("At least 3 points are required for Pearson correlation");
  }
  if (xs.length !== ys.length) {
    throw new Error("xs and ys must have the same length");
  }

  const n = xs.length;
  const xMean = mean(xs);
  const yMean = mean(ys);

  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - xMean;
    const dy = ys[i] - yMean;
    numerator += dx * dy;
    xDenominator += dx ** 2;
    yDenominator += dy ** 2;
  }

  const denominator = Math.sqrt(xDenominator * yDenominator);
  const r = denominator === 0 ? 0 : numerator / denominator;
  const rSquared = r ** 2;

  // t-statistic with n-2 degrees of freedom
  const df = n - 2;
  const tStat =
    Math.abs(r) === 1
      ? Infinity
      : (Math.abs(r) * Math.sqrt(df)) / Math.sqrt(1 - r ** 2);
  const pValue = approximatePValue(tStat, df);

  return { r, rSquared, pValue, n };
}

export function zScoreNormalize(values: number[]): number[] {
  if (values.length === 0) return [];
  const m = mean(values);
  const sd = standardDeviation(values);
  if (sd === 0) return values.map(() => 0);
  return values.map((v) => (v - m) / sd);
}

export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }
  return Math.sqrt(a.reduce((sum, ai, i) => sum + (ai - b[i]) ** 2, 0));
}

export function similarityScore(distance: number): number {
  return (1 / (1 + distance)) * 100;
}
