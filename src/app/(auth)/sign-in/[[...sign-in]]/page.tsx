import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default function SignInPage() {
  const { userId } = auth();

  if (userId) {
    redirect("/app/today");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <SignIn
        appearance={{ baseTheme: "dark" }}
        signUpUrl="/sign-up"
        afterSignInUrl="/app/today"
        afterSignUpUrl="/app/today"
      />
    </div>
  );
}
