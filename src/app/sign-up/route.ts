import { getSignUpUrl } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import { getWorkosRedirectUri } from "@/lib/workos-redirect-uri";

export async function GET() {
  const authorizationUrl = await getSignUpUrl({
    redirectUri: getWorkosRedirectUri(),
  });
  return NextResponse.redirect(authorizationUrl);
}
