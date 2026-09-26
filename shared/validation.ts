export function isLocalDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function validateLocalDay(value: string): void {
  if (!isLocalDay(value)) throw new Error("Choose a valid calendar date");
}

export function validateTimezone(value: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
  } catch {
    throw new Error("Choose a valid timezone");
  }
}

export function validateHabit(fields: {
  title: string;
  description?: string;
  scheduleType: "daily" | "specific_days";
  allowedDays?: number[];
  dailyGoal?: number;
  goalUnit?: string;
  customUnit?: string;
}): void {
  if (!fields.title.trim() || fields.title.trim().length > 120) {
    throw new Error("Habit titles must contain 1–120 characters");
  }
  if ((fields.description?.length ?? 0) > 1000) {
    throw new Error("Descriptions must be 1,000 characters or fewer");
  }
  if (fields.scheduleType === "specific_days") {
    const days = fields.allowedDays;
    if (
      !days?.length ||
      days.length > 7 ||
      days.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
      new Set(days).size !== days.length
    ) {
      throw new Error("Select at least one weekday, without duplicates");
    }
  }
  const dailyGoal = fields.dailyGoal ?? 1;
  if (
    !Number.isFinite(dailyGoal) ||
    dailyGoal <= 0 ||
    dailyGoal > 1_000_000_000
  ) {
    throw new Error("Daily goals must be greater than 0");
  }
  const validUnits = ["times", "steps", "minutes", "mg", "custom"];
  const goalUnit = fields.goalUnit ?? "times";
  if (!validUnits.includes(goalUnit)) {
    throw new Error("Choose a valid goal unit");
  }
  if (goalUnit === "custom") {
    const customUnit = fields.customUnit?.trim() ?? "";
    if (!customUnit || customUnit.length > 24) {
      throw new Error("Custom units must contain 1–24 characters");
    }
  }
}
