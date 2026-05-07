import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { SessionProvider } from "next-auth/react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "admin") redirect("/calendar");

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen bg-slate-50">
        <Sidebar userName={(session.user as any).displayName || session.user.name || "관리자"} />
        <main className="lg:ml-60 min-h-screen">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </SessionProvider>
  );
}
