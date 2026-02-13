import { requireRole } from "@/lib/auth";
import OwnerProductsClient from "./ui";

export default async function OwnerProductsPage() {
  await requireRole("OWNER");
  return <OwnerProductsClient />;
}
