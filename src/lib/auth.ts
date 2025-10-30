import {
  auth as clerkAuth,
  currentUser as clerkCurrentUser,
  clerkClient,
} from "@clerk/nextjs/server";

export const auth = clerkAuth;
export const currentUser = clerkCurrentUser;
export const clerk = clerkClient;

export async function requireUser() {
  const { userId } = await clerkAuth();

  if (!userId) {
    throw new Error("Authentication required");
  }

  return { userId };
}

