import Link from "next/link";
import Shell from "../Shell";
import MaintainerTable from "./MaintainerTable";
import UsersModule from "../usuarios/UsersModule";
import { getClients, getDevices, getEquipment, getParts, getQuestions } from "@/lib/maintainers";
import { canManageUsers, getUsers, USER_ROLES } from "@/lib/users";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// "Usuarios" (antes en Sistema) vive aqui como una pestaña mas: Configuración
// fusiona Sistema + Mantenedores en una sola pantalla con tabs.
const RESOURCE_TABS = [
  { key: "clientes", label: "Clientes" },
  { key: "equipos", label: "Marcas" },
  { key: "dispositivos", label: "Modelos" },
  { key: "repuestos", label: "Repuestos" },
  { key: "preguntas", label: "Preguntas" },
  { key: "usuarios", label: "Usuarios" },
];

function getResourceConfig(type, equipment = []) {
  const configs = {
    clientes: {
      title: "Clientes",
      addLabel: "Agregar Cliente",
      fields: [
        { key: "nombre", label: "Nombre", required: true },
        { key: "run", label: "RUT", type: "rut" },
        { key: "mail", label: "Email" },
        { key: "fono", label: "Telefono" },
        { key: "estado", label: "Estado", type: "status", defaultValue: 1 },
      ],
      columns: [
        { key: "nombre", label: "Nombre" },
        { key: "run", label: "RUT", type: "rut" },
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
  if (type === "preguntas") return getQuestions({ search });
  return getClients({ search });
}

export default async function MaintainersPage({ searchParams }) {
  const params = await searchParams;
  const requestedType = String(params?.tipo || "clientes");
  const type = RESOURCE_TABS.some((tab) => tab.key === requestedType) ? requestedType : "clientes";
  const search = String(params?.q || "");

  let content;
  if (type === "usuarios") {
    const session = await requireSession();
    const allowed = canManageUsers(session);
    const users = allowed ? await getUsers() : [];
    content = allowed ? (
      <UsersModule initialUsers={users} roles={USER_ROLES} currentUserId={session.id} />
    ) : (
      <section className="panel">
        <div className="panel-header">
          <h2>Sin permiso</h2>
        </div>
        <p className="empty-state">Tu rol actual no permite administrar usuarios.</p>
      </section>
    );
  } else {
    const equipment = type === "dispositivos" ? await getEquipment() : [];
    const rows = await getRows(type, search);
    const config = getResourceConfig(type, equipment);
    content = (
      <MaintainerTable
        title={config.title}
        resource={type}
        rows={rows}
        search={search}
        addLabel={config.addLabel}
        fields={config.fields}
        columns={config.columns}
      />
    );
  }

  return (
    <Shell active="configuracion" title="Configuración">
      <section className="maintainer-tabs panel">
        <div className="panel-header panel-header-wrap">
          <h2>Configuración</h2>
          <div className="maintainer-tab-list" role="tablist" aria-label="Configuración">
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

      <div className="section-gap">{content}</div>
    </Shell>
  );
}
