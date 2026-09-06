import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { getLocalDay } from "@/lib/dates";

/** Refresh both while open across midnight and when returning from background. */
export function useLocalDay(timezone: string): string {
  const [day, setDay] = useState(() => getLocalDay(timezone));
  useEffect(() => {
    const refresh = () => setDay(getLocalDay(timezone));
    refresh();
    const timer = setInterval(refresh, 1000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [timezone]);
  // A timezone preference change must take effect on this render.
  return day === getLocalDay(timezone) ? day : getLocalDay(timezone);
}
