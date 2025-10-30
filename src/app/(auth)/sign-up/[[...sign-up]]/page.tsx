import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default function SignUpPage() {
  const { userId } = auth();

  if (userId) {
    redirect("/app/today");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <SignUp
        appearance={{ baseTheme: "dark" }}
        signInUrl="/sign-in"
        afterSignInUrl="/app/today"
        afterSignUpUrl="/app/today"
      />
    </div>
  );
}
