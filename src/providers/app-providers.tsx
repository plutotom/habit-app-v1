import type { ReactNode } from "react";

import { LocalDatabaseProvider } from "@/local/provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return <LocalDatabaseProvider>{children}</LocalDatabaseProvider>;
}
