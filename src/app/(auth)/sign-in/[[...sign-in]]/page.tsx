import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <SignIn appearance={{ baseTheme: "dark" }} />
    </div>
  );
}

