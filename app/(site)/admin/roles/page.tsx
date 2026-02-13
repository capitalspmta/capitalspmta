import { requireRole } from "@/lib/auth";
import RolesClient from "./ui";

export default async function RolesPage() {
  await requireRole("ADMIN");
  return <RolesClient />;
}
