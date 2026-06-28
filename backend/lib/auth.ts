import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function getUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_workosId", (q) => q.eq("workosId", identity.subject))
    .unique();
}

export async function requireUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await getUser(ctx);
  if (!user) throw new Error("Not authenticated");
  return user;
}
