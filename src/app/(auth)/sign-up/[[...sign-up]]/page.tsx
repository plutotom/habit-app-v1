import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SignUpPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/app/today");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <SignUp
        signInUrl="/sign-in"
        afterSignInUrl="/app/today"
        afterSignUpUrl="/app/today"
      />
    </div>
  );
}
