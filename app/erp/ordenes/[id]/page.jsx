import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OrderDetailRedirect({ params }) {
  const { id } = await params;
  redirect(`/erp/ordenes?tab=revision&id=${id}`);
}
