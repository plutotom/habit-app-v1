import { getSignUpUrl } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  const authorizationUrl = await getSignUpUrl({
    redirectUri: process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI,
  });
  return NextResponse.redirect(authorizationUrl);
}
