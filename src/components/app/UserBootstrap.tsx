import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";

import { api } from "@backend/api";
import { useAuth } from "@/auth/auth-provider";

export function UserBootstrap() {
  const { isAuthenticated } = useConvexAuth();
  const { user } = useAuth();
  const getOrCreate = useMutation(api.users.getOrCreate);
  const ran = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      ran.current = false;
      return;
    }
    if (ran.current) return;
    ran.current = true;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    void getOrCreate({ email: user?.email, timezone });
  }, [isAuthenticated, user?.email, getOrCreate]);

  return null;
}
