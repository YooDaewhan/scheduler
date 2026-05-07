import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role === "admin") redirect("/admin/calendar");
  redirect("/calendar");
}
