"use client";

import { useEffect, useRef } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@backend/api";

export function UserBootstrap({ email }: { email?: string }) {
  const { isAuthenticated } = useConvexAuth();
  const getOrCreate = useMutation(api.routes.auth.users.getOrCreate);
  const ran = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || ran.current) return;
    ran.current = true;
    void getOrCreate({ email });
  }, [isAuthenticated, email, getOrCreate]);

  return null;
}
