import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  // Marketing landing and auth routes remain public; everything else requires auth.
  publicRoutes: ["/", "/sign-in(.*)", "/sign-up(.*)", "/api/health"],
});

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};

