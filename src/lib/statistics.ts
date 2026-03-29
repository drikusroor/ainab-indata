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

/**
 * Polynomial regression using least-squares via normal equations.
 * Returns coefficients [a0, a1, a2, ...] where y = a0 + a1*x + a2*x^2 + ...
 */
export interface PolynomialRegressionResult {
  coefficients: number[]
  degree: number
  rSquared: number
  predict: (x: number) => number
}

export function polynomialRegression(
  xs: number[],
  ys: number[],
  degree: number
): PolynomialRegressionResult {
  if (xs.length !== ys.length) throw new Error('Arrays must have equal length')
  if (xs.length < degree + 1) throw new Error(`Need at least ${degree + 1} points for degree ${degree}`)

  const n = xs.length
  const d = degree + 1

  // Center x values for numerical stability
  const xMean = mean(xs)
  const centered = xs.map(x => x - xMean)

  // Build Vandermonde matrix V and solve V^T * V * a = V^T * y
  // Using normal equations (sufficient for low-degree polynomials)
  const VTV: number[][] = Array.from({ length: d }, () => new Array(d).fill(0))
  const VTy: number[] = new Array(d).fill(0)

  for (let i = 0; i < n; i++) {
    const powers: number[] = new Array(d)
    powers[0] = 1
    for (let j = 1; j < d; j++) {
      powers[j] = powers[j - 1] * centered[i]
    }
    for (let j = 0; j < d; j++) {
      VTy[j] += powers[j] * ys[i]
      for (let k = 0; k < d; k++) {
        VTV[j][k] += powers[j] * powers[k]
      }
    }
  }

  // Solve via Gaussian elimination with partial pivoting
  const augmented = VTV.map((row, i) => [...row, VTy[i]])
  for (let col = 0; col < d; col++) {
    // Pivot
    let maxRow = col
    for (let row = col + 1; row < d; row++) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) maxRow = row
    }
    ;[augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]]

    const pivot = augmented[col][col]
    if (Math.abs(pivot) < 1e-12) continue

    for (let row = col + 1; row < d; row++) {
      const factor = augmented[row][col] / pivot
      for (let k = col; k <= d; k++) {
        augmented[row][k] -= factor * augmented[col][k]
      }
    }
  }

  // Back substitution
  const coeffsCentered = new Array(d).fill(0)
  for (let i = d - 1; i >= 0; i--) {
    let sum = augmented[i][d]
    for (let j = i + 1; j < d; j++) {
      sum -= augmented[i][j] * coeffsCentered[j]
    }
    coeffsCentered[i] = Math.abs(augmented[i][i]) < 1e-12 ? 0 : sum / augmented[i][i]
  }

  // Build predict function using centered coefficients
  const predict = (x: number) => {
    const cx = x - xMean
    let result = 0
    let power = 1
    for (let i = 0; i < d; i++) {
      result += coeffsCentered[i] * power
      power *= cx
    }
    return result
  }

  // R² calculation
  const yMean = mean(ys)
  let ssTotal = 0
  let ssResidual = 0
  for (let i = 0; i < n; i++) {
    ssTotal += (ys[i] - yMean) ** 2
    ssResidual += (ys[i] - predict(xs[i])) ** 2
  }
  const rSquared = ssTotal === 0 ? NaN : 1 - ssResidual / ssTotal

  return { coefficients: coeffsCentered, degree, rSquared, predict }
}

/**
 * Exponential regression: fits y = a * e^(b * x)
 * Uses log-linear transform: ln(y) = ln(a) + b*x, then linear regression.
 * Only works with positive y values.
 */
export interface ExponentialRegressionResult {
  a: number
  b: number
  rSquared: number
  predict: (x: number) => number
}

export function exponentialRegression(
  xs: number[],
  ys: number[]
): ExponentialRegressionResult {
  if (xs.length !== ys.length) throw new Error('Arrays must have equal length')
  if (xs.length < 2) throw new Error('Need at least 2 data points')

  // Filter out non-positive y values (can't take log)
  const valid = xs.map((x, i) => ({ x, y: ys[i] })).filter(p => p.y > 0)
  if (valid.length < 2) throw new Error('Need at least 2 positive y values for exponential fit')

  const logYs = valid.map(p => Math.log(p.y))
  const validXs = valid.map(p => p.x)

  const reg = linearRegression(validXs, logYs)
  const a = Math.exp(reg.intercept)
  const b = reg.slope

  const predict = (x: number) => a * Math.exp(b * x)

  // R² on original scale
  const yMean = mean(ys)
  let ssTotal = 0
  let ssResidual = 0
  for (let i = 0; i < xs.length; i++) {
    ssTotal += (ys[i] - yMean) ** 2
    ssResidual += (ys[i] - predict(xs[i])) ** 2
  }
  const rSquared = ssTotal === 0 ? NaN : 1 - ssResidual / ssTotal

  return { a, b, rSquared, predict }
}

/**
 * Double exponential smoothing (Holt's method).
 * Captures level + trend, weights recent data more heavily.
 * Good for short-to-medium term forecasting.
 * alpha: level smoothing (0-1), beta: trend smoothing (0-1)
 */
export interface HoltForecastResult {
  fittedValues: number[]
  predict: (stepsAhead: number) => number
}

export function holtSmoothing(
  ys: number[],
  alpha = 0.6,
  beta = 0.4
): HoltForecastResult {
  if (ys.length < 2) throw new Error('Need at least 2 data points')

  // Initialize
  let level = ys[0]
  let trend = ys[1] - ys[0]
  const fitted: number[] = [level]

  for (let i = 1; i < ys.length; i++) {
    const prevLevel = level
    level = alpha * ys[i] + (1 - alpha) * (prevLevel + trend)
    trend = beta * (level - prevLevel) + (1 - beta) * trend
    fitted.push(level + trend)
  }

  const lastLevel = level
  const lastTrend = trend

  return {
    fittedValues: fitted,
    predict: (stepsAhead: number) => lastLevel + stepsAhead * lastTrend,
  }
}
