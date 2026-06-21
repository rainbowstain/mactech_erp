import Link from "next/link";
import Shell from "../Shell";
import MaintainerTable from "./MaintainerTable";
import { getClients, getDevices, getEquipment, getParts, getQuestions, getServices } from "@/lib/maintainers";

export const dynamic = "force-dynamic";

const RESOURCE_TABS = [
  { key: "clientes", label: "Clientes" },
  { key: "equipos", label: "Marcas" },
  { key: "dispositivos", label: "Modelos" },
  { key: "repuestos", label: "Repuestos" },
  { key: "servicios", label: "Servicios" },
  { key: "preguntas", label: "Preguntas" },
];

function getResourceConfig(type, equipment = []) {
  const configs = {
    clientes: {
      title: "Clientes",
      addLabel: "Agregar Cliente",
      fields: [
        { key: "nombre", label: "Nombre", required: true },
        { key: "run", label: "RUT" },
        { key: "mail", label: "Email" },
        { key: "fono", label: "Telefono" },
        { key: "estado", label: "Estado", type: "status", defaultValue: 1 },
      ],
      columns: [
        { key: "nombre", label: "Nombre" },
        { key: "run", label: "RUT" },
        { key: "mail", label: "Email" },
        { key: "fono", label: "Telefono" },
        { key: "estado", label: "Estado", type: "status", align: "center" },
      ],
    },
    equipos: {
      title: "Marcas",
      addLabel: "Agregar Marca",
      fields: [
        { key: "nombre", label: "Nombre", required: true },
        { key: "estado", label: "Estado", type: "status", defaultValue: 1 },
      ],
      columns: [
        { key: "nombre", label: "Nombre" },
        { key: "estado", label: "Estado", type: "status", align: "center" },
      ],
    },
    dispositivos: {
      title: "Modelos",
      addLabel: "Agregar Modelo",
      fields: [
        { key: "nombre", label: "Nombre", required: true },
        {
          key: "modelo",
          label: "Marca",
          type: "select",
          required: true,
          options: equipment.map((item) => ({ value: item.id, label: item.nombre })),
        },
        { key: "estado", label: "Estado", type: "status", defaultValue: 1 },
      ],
      columns: [
        { key: "nombre", label: "Nombre" },
        { key: "equipo_nombre", label: "Marca" },
        { key: "estado", label: "Estado", type: "status", align: "center" },
      ],
    },
    repuestos: {
      title: "Tipos de reparacion",
      addLabel: "Agregar Tipo",
      fields: [
        { key: "nombre", label: "Nombre", required: true },
        { key: "estado", label: "Estado", type: "status", defaultValue: 1 },
      ],
      columns: [
        { key: "nombre", label: "Nombre" },
        { key: "estado", label: "Estado", type: "status", align: "center" },
      ],
    },
    servicios: {
      title: "Servicios",
      addLabel: "Agregar Servicio",
      fields: [
        { key: "nombre", label: "Nombre", required: true },
        { key: "precio", label: "Precio", type: "money", defaultValue: 0 },
        { key: "costo", label: "Costo", type: "money", defaultValue: 0 },
        { key: "estado", label: "Estado", type: "status", defaultValue: 1 },
      ],
      columns: [
        { key: "nombre", label: "Nombre" },
        { key: "precio", label: "Precio", type: "money" },
        { key: "costo", label: "Costo", type: "money" },
        { key: "estado", label: "Estado", type: "status", align: "center" },
      ],
    },
    preguntas: {
      title: "Preguntas",
      addLabel: "Agregar Pregunta",
      fields: [
        { key: "descripcion", label: "Descripcion", type: "textarea", required: true, wide: true },
        { key: "estado", label: "Estado", type: "status", defaultValue: 1 },
      ],
      columns: [
        { key: "descripcion", label: "Descripcion" },
        { key: "estado", label: "Estado", type: "status", align: "center" },
      ],
    },
  };
  return configs[type] || configs.clientes;
}

async function getRows(type, search) {
  if (type === "equipos") return getEquipment({ search });
  if (type === "dispositivos") return getDevices({ search });
  if (type === "repuestos") return getParts({ search });
  if (type === "servicios") return getServices({ search });
  if (type === "preguntas") return getQuestions({ search });
  return getClients({ search });
}

export default async function MaintainersPage({ searchParams }) {
  const params = await searchParams;
  const requestedType = String(params?.tipo || "clientes");
  const type = RESOURCE_TABS.some((tab) => tab.key === requestedType) ? requestedType : "clientes";
  const search = String(params?.q || "");
  const equipment = type === "dispositivos" ? await getEquipment() : [];
  const rows = await getRows(type, search);
  const config = getResourceConfig(type, equipment);

  return (
    <Shell active="mantenedores" title="Mantenedores">
      <section className="maintainer-tabs panel">
        <div className="panel-header panel-header-wrap">
          <h2>Mantenedores</h2>
          <div className="maintainer-tab-list" role="tablist" aria-label="Mantenedores">
            {RESOURCE_TABS.map((tab) => (
              <Link
                className={`maintainer-tab ${type === tab.key ? "active" : ""}`}
                href={`/erp/mantenedores?tipo=${tab.key}`}
                key={tab.key}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="section-gap">
        <MaintainerTable
          title={config.title}
          resource={type}
          rows={rows}
          search={search}
          addLabel={config.addLabel}
          fields={config.fields}
          columns={config.columns}
        />
      </div>
    </Shell>
  );
}
