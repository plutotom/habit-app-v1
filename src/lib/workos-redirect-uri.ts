const PRODUCTION_REDIRECT_URI = "https://habits.plutotom.com/callback";
const LOCAL_REDIRECT_URI = "http://localhost:4021/callback";

/**
 * Resolves the WorkOS AuthKit redirect URI for the current deployment.
 * Explicit env var takes precedence; otherwise falls back to known deployment URLs.
 */
export function getWorkosRedirectUri(): string {
  if (process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI) {
    return process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI;
  }

  if (process.env.VERCEL_ENV === "production") {
    return PRODUCTION_REDIRECT_URI;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/callback`;
  }

  return LOCAL_REDIRECT_URI;
}
