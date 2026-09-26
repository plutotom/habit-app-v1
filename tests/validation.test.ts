import { expect, test } from "vitest";
import { validateHabit } from "../shared/validation";

const base = {
  title: "Walk",
  scheduleType: "daily" as const,
};

test("omitted goal units default to times so backend callers still validate", () => {
  expect(() => validateHabit(base)).not.toThrow();
});

test("explicit invalid goal units are rejected", () => {
  expect(() => validateHabit({ ...base, goalUnit: "laps" })).toThrow(
    "Choose a valid goal unit",
  );
});

test("custom units require a 1–24 character label", () => {
  expect(() => validateHabit({ ...base, goalUnit: "custom" })).toThrow(
    "Custom units must contain 1–24 characters",
  );
  expect(() =>
    validateHabit({ ...base, goalUnit: "custom", customUnit: "pages" }),
  ).not.toThrow();
});
