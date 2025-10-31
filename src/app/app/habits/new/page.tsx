import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createHabit } from "@/lib/habits-service";
import { assertRateLimit } from "@/lib/rate-limit";
import { requireCurrentAppUser } from "@/lib/users";
import { habitCreateSchema } from "@/lib/validators";
import HabitForm from "@/components/habits/HabitForm";

const trackTypes = [
  { label: "Binary", value: "binary" },
  { label: "Count", value: "count" },
  { label: "Duration", value: "duration" },
  { label: "Timer", value: "timer" },
];

const scheduleTypes = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Custom", value: "custom" },
];

const dayOptions = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export default function NewHabitPage() {
  const createHabitAction = async (formData: FormData) => {
    "use server";

    const user = await requireCurrentAppUser();
    const payload = habitCreateSchema.parse({
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      trackType: formData.get("trackType"),
      scheduleType: formData.get("scheduleType"),
      countTarget: formData.get("countTarget") ? Number(formData.get("countTarget")) : undefined,
      perPeriod: formData.get("perPeriod") || undefined,
      allowedDays: formData.getAll("allowedDays") as string[],
      dayBoundaryOffsetMinutes: formData.get("dayBoundaryOffsetMinutes")
        ? Number(formData.get("dayBoundaryOffsetMinutes"))
        : undefined,
      skipPolicy: formData.get("skipPolicy") || undefined,
      freezeEnabled: formData.get("freezeEnabled") === "on",
      color: formData.get("color") || undefined,
      icon: formData.get("icon") || undefined,
      category: formData.get("category") || undefined,
    });

    await assertRateLimit({
      userId: user.id,
      bucket: "habit:create",
      limit: 20,
      windowMs: 60_000,
    });

    const habit = await createHabit(user.id, payload);
    revalidatePath("/app/today");
    redirect("/app/today");
  };

  return (
    <HabitForm action={createHabitAction} heading="Create habit" submitLabel="Create habit" />
  );
}

