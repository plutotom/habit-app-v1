import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import HabitForm from "@/components/habits/HabitForm";
import { getHabitOrThrow, updateHabit } from "@/lib/habits-service";
import { assertRateLimit } from "@/lib/rate-limit";
import { requireCurrentAppUser } from "@/lib/users";
import { habitCreateSchema } from "@/lib/validators";

type Params = { params: Promise<{ habitId: string }> };

export default async function EditHabitPage({ params }: Params) {
  const { habitId } = await params;
  const user = await requireCurrentAppUser();
  const habit = await getHabitOrThrow(habitId, user.id);

  const updateHabitAction = async (formData: FormData) => {
    "use server";

    const userInner = await requireCurrentAppUser();
    const { habitId: habitIdInner } = await params;

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
      userId: userInner.id,
      bucket: "habit:update",
      limit: 60,
      windowMs: 60_000,
    });

    await updateHabit(habitIdInner, userInner.id, payload);
    revalidatePath(`/app/habits/${habitIdInner}`);
    redirect(`/app/habits/${habitIdInner}`);
  };

  return (
    <HabitForm
      action={updateHabitAction}
      heading="Edit habit"
      submitLabel="Save changes"
      initialValues={{
        title: habit.title,
        description: habit.description ?? "",
        trackType: habit.trackType,
        scheduleType: habit.scheduleType,
        countTarget: habit.countTarget ?? undefined,
        dayBoundaryOffsetMinutes: habit.dayBoundaryOffsetMinutes ?? 0,
        allowedDays: Array.isArray(habit.allowedDays) ? (habit.allowedDays as string[]) : [],
        freezeEnabled: habit.freezeEnabled,
      }}
    />
  );
}


