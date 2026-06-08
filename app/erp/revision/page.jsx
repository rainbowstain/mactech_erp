import { redirect } from "next/navigation";

export default async function RevisionRedirect({ searchParams }) {
  const params = await searchParams;
  const next = new URLSearchParams({ tab: "revision" });

  for (const key of ["idOrden", "id", "run", "nombre"]) {
    if (params?.[key]) next.set(key, String(params[key]));
  }

  redirect(`/erp/ordenes?${next.toString()}`);
}
