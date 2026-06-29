import { authkitProxy } from "@workos-inc/authkit-nextjs";
import { getWorkosRedirectUri } from "@/lib/workos-redirect-uri";

export default authkitProxy({
  redirectUri: getWorkosRedirectUri(),
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ["/", "/sign-in", "/sign-up", "/sign-out", "/callback"],
  },
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
