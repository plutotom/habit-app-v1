import type { HabitGoalUnit } from "@/local/types";

export const GOAL_UNIT_OPTIONS: {
  value: HabitGoalUnit;
  label: string;
}[] = [
  { value: "times", label: "Times" },
  { value: "steps", label: "Steps" },
  { value: "minutes", label: "Minutes" },
  { value: "mg", label: "Milligrams" },
  { value: "custom", label: "Custom" },
];

export function formatGoalNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 3,
  }).format(value);
}

export function formatGoalUnit(
  unit: HabitGoalUnit,
  amount: number,
  customUnit?: string,
): string {
  if (unit === "custom") return customUnit?.trim() || "units";
  if (unit === "mg") return "mg";
  if (unit === "times") return amount === 1 ? "time" : "times";
  if (unit === "steps") return amount === 1 ? "step" : "steps";
  return amount === 1 ? "minute" : "minutes";
}

export function formatGoal(
  amount: number,
  unit: HabitGoalUnit,
  customUnit?: string,
): string {
  return `${formatGoalNumber(amount)} ${formatGoalUnit(unit, amount, customUnit)}`;
}
