import { withAuth } from "@workos-inc/authkit-nextjs";
import { UserBootstrap } from "@/components/app/UserBootstrap";
import { BottomNav } from "@/components/app/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await withAuth();

  return (
    <div className="flex min-h-full flex-col">
      <main
        className="mx-auto w-full max-w-xl flex-1 px-4 py-4"
        style={{ paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>
      <BottomNav />
      <UserBootstrap email={user?.email} />
    </div>
  );
}
