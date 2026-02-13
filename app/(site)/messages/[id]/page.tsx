
import { requireActiveUser } from "@/lib/guards";
import ThreadClient from "./ui";

export default async function ThreadPage({ params }: { params: { id: string } }) {
  await requireActiveUser();
  return <ThreadClient id={params.id} />;
}
