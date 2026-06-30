export const dynamic = 'force-dynamic';
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/auth";
import AdminApp from "./admin-app";

export default async function AdminPage() {
  const ok = await isAdminRequest();
  if (!ok) redirect("/admin/login");
  return <AdminApp />;
}
