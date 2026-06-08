import { redirect } from "next/navigation";

export default async function ClosedOrdersRedirect({ searchParams }) {
  const params = await searchParams;
  const next = new URLSearchParams({ tab: "cerradas" });
  if (params?.q) next.set("q", String(params.q));

  redirect(`/erp/ordenes?${next.toString()}`);
}
