import Shell from "../Shell";
import { requireSession } from "@/lib/auth";
import { canManageUsers, getUsers, USER_ROLES } from "@/lib/users";
import UsersModule from "./UsersModule";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await requireSession();
  const allowed = canManageUsers(session);
  const users = allowed ? await getUsers() : [];

  return (
    <Shell active="usuarios" title="Usuarios">
      {allowed ? (
        <UsersModule initialUsers={users} roles={USER_ROLES} currentUserId={session.id} />
      ) : (
        <section className="panel">
          <div className="panel-header">
            <h2>Sin permiso</h2>
          </div>
          <p className="empty-state">Tu rol actual no permite administrar usuarios.</p>
        </section>
      )}
    </Shell>
  );
}
