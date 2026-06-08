import { requireSession } from "@/lib/auth";
import ErpFrame from "./ErpFrame";

export default async function Shell({ active, title, children }) {
  const session = await requireSession();

  return (
    <ErpFrame active={active} title={title} session={session}>
      {children}
    </ErpFrame>
  );
}
