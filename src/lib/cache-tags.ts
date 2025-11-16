export function tagUserHabits(userId: string) {
  return `user:${userId}:habits`;
}

export function tagHabitDetail(habitId: string) {
  return `habit:${habitId}:detail`;
}

export function tagHabitRecords(habitId: string) {
  return `habit:${habitId}:records`;
}

export function tagHabitAnalytics(habitId: string) {
  return `habit:${habitId}:analytics`;
}

export function tagTodayForUser(userId: string) {
  return `user:${userId}:today`;
}


