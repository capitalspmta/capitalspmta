
import { requireActiveUser } from "@/lib/guards";
import MessagesClient from "./ui";

export default async function MessagesPage() {
  await requireActiveUser();
  return <MessagesClient />;
}
