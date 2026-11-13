import { describe, it, expect } from "vitest";
import { computeReport, statusToClass, type Sample } from "./metrics";

describe("statusToClass", () => {
  it("maps engine statuses to validation classes", () => {
    expect(statusToClass("ACTIVE")).toBe("ACTIVE");
    expect(statusToClass("WATCH")).toBe("ACTIVE");
    expect(statusToClass("STASIS")).toBe("STALLED");
    expect(statusToClass("REVIEW")).toBe("REVIEW");
    expect(statusToClass("DATA_GAP")).toBe("INSUFFICIENT");
  });
});

describe("computeReport", () => {
  const samples: Sample[] = [
    { predicted: "STALLED", confidence: "HIGH", truth: "STALLED" }, // tp
    { predicted: "STALLED", confidence: "HIGH", truth: "STALLED" }, // tp
    { predicted: "ACTIVE", confidence: "MEDIUM", truth: "STALLED" }, // fn
    { predicted: "ACTIVE", confidence: "LOW", truth: "ACTIVE" }, // tn
    { predicted: "STALLED", confidence: "LOW", truth: "ACTIVE" }, // fp
    { predicted: "REVIEW", confidence: "LOW", truth: "ACTIVE" }, // abstain
    { predicted: "INSUFFICIENT", confidence: "LOW", truth: "STALLED" }, // insufficient
  ];
  const r = computeReport(samples);

  it("counts the confusion matrix over decisive samples only", () => {
    expect(r.confusion).toEqual({ tp: 2, fp: 1, tn: 1, fn: 1 });
    expect(r.total).toBe(7);
    expect(r.decisive).toBe(5);
  });

  it("computes precision, recall, FP/FN rates", () => {
    expect(r.precision).toBeCloseTo(2 / 3);
    expect(r.recall).toBeCloseTo(2 / 3);
    expect(r.falsePositiveRate).toBeCloseTo(1 / 2);
    expect(r.falseNegativeRate).toBeCloseTo(1 / 3);
    expect(r.accuracy).toBeCloseTo(3 / 5);
  });

  it("tracks abstention and insufficiency separately from errors", () => {
    expect(r.coverage).toBeCloseTo(5 / 7);
    expect(r.abstainRate).toBeCloseTo(1 / 7);
    expect(r.insufficientRate).toBeCloseTo(1 / 7);
  });

  it("reports calibration per confidence band", () => {
    expect(r.calibration.HIGH).toEqual({ n: 2, accuracy: 1 });
    expect(r.calibration.MEDIUM).toEqual({ n: 1, accuracy: 0 });
    expect(r.calibration.LOW).toEqual({ n: 2, accuracy: 0.5 });
  });

  it("returns nulls, not NaN, when a denominator is zero", () => {
    const empty = computeReport([]);
    expect(empty.precision).toBeNull();
    expect(empty.coverage).toBe(0);
    expect(empty.calibration.HIGH.accuracy).toBeNull();
  });
});
