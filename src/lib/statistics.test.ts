import { describe, it, expect } from "bun:test";
import {
  mean,
  standardDeviation,
  linearRegression,
  pearsonCorrelation,
  zScoreNormalize,
  euclideanDistance,
  similarityScore,
} from "./statistics";

describe("mean", () => {
  it("returns arithmetic mean of [1,2,3,4,5]", () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
  });

  it("returns the value itself for a single-element array", () => {
    expect(mean([42])).toBe(42);
  });

  it("returns NaN for empty array", () => {
    expect(mean([])).toBeNaN();
  });
});

describe("standardDeviation", () => {
  it("returns population std dev of [2,4,4,4,5,5,7,9] ≈ 2.0", () => {
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.0, 5);
  });

  it("returns 0 for identical values", () => {
    expect(standardDeviation([5, 5, 5])).toBe(0);
  });

  it("returns 0 for a single value", () => {
    expect(standardDeviation([7])).toBe(0);
  });
});

describe("linearRegression", () => {
  it("finds slope=2, intercept=0, rSquared=1 for perfect line y=2x", () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [2, 4, 6, 8, 10];
    const result = linearRegression(xs, ys);
    expect(result.slope).toBeCloseTo(2, 10);
    expect(result.intercept).toBeCloseTo(0, 10);
    expect(result.rSquared).toBeCloseTo(1, 10);
  });

  it("returns slope=0 for flat data", () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [3, 3, 3, 3, 3];
    const result = linearRegression(xs, ys);
    expect(result.slope).toBe(0);
    expect(result.rSquared).toBeNaN();
  });

  it("throws for mismatched array lengths", () => {
    expect(() => linearRegression([1, 2, 3], [1, 2])).toThrow();
  });

  it("throws for fewer than 2 points", () => {
    expect(() => linearRegression([1], [1])).toThrow();
    expect(() => linearRegression([], [])).toThrow();
  });
});

describe("pearsonCorrelation", () => {
  it("returns r=1 for perfect positive correlation", () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [2, 4, 6, 8, 10];
    const result = pearsonCorrelation(xs, ys);
    expect(result.r).toBeCloseTo(1, 10);
    expect(result.rSquared).toBeCloseTo(1, 10);
    expect(result.n).toBe(5);
  });

  it("returns r=-1 for perfect negative correlation", () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [10, 8, 6, 4, 2];
    const result = pearsonCorrelation(xs, ys);
    expect(result.r).toBeCloseTo(-1, 10);
    expect(result.rSquared).toBeCloseTo(1, 10);
    expect(result.n).toBe(5);
  });

  it("returns |r| < 0.5 for uncorrelated data", () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [3, 1, 4, 1, 5];
    const result = pearsonCorrelation(xs, ys);
    expect(Math.abs(result.r)).toBeLessThan(0.5);
  });

  it("throws for fewer than 3 points", () => {
    expect(() => pearsonCorrelation([1, 2], [1, 2])).toThrow();
    expect(() => pearsonCorrelation([1], [1])).toThrow();
    expect(() => pearsonCorrelation([], [])).toThrow();
  });

  it("includes pValue and n in result", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const ys = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
    const result = pearsonCorrelation(xs, ys);
    expect(result.n).toBe(10);
    expect(result.pValue).toBeDefined();
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
  });
});

describe("zScoreNormalize", () => {
  it("produces normalized values with mean ≈ 0 and std ≈ 1", () => {
    const values = [10, 20, 30, 40, 50];
    const normalized = zScoreNormalize(values);
    const normalizedMean = mean(normalized);
    const normalizedStd = standardDeviation(normalized);
    expect(normalizedMean).toBeCloseTo(0, 10);
    expect(normalizedStd).toBeCloseTo(1, 10);
  });

  it("returns [0,0,0] for identical values", () => {
    expect(zScoreNormalize([5, 5, 5])).toEqual([0, 0, 0]);
  });

  it("returns empty array for empty input", () => {
    expect(zScoreNormalize([])).toEqual([]);
  });
});

describe("euclideanDistance", () => {
  it("returns 5 for [0,0] and [3,4]", () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBe(5);
  });

  it("returns 0 for identical vectors", () => {
    expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it("handles higher-dimensional vectors", () => {
    expect(euclideanDistance([0, 0, 0], [1, 1, 1])).toBeCloseTo(
      Math.sqrt(3),
      10
    );
  });
});

describe("similarityScore", () => {
  it("returns 100 for distance 0", () => {
    expect(similarityScore(0)).toBe(100);
  });

  it("returns a value between 0 and 100 for positive distance", () => {
    const score = similarityScore(5);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it("decreases as distance increases", () => {
    expect(similarityScore(1)).toBeGreaterThan(similarityScore(2));
    expect(similarityScore(2)).toBeGreaterThan(similarityScore(10));
  });
});
