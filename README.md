# MacTech ERP

ERP nuevo e independiente para MacTech, construido con Next.js, React y Postgres/Supabase.

Este repo vive separado del proyecto antiguo:

- Nuevo ERP: `/Users/eduardo/mactech-erp`
- Landing/legacy: `/Users/eduardo/mactech`

## Desarrollo local

1. Copiar `.env.example` a `.env.local` y ajustar valores locales.
2. Levantar Postgres local.
3. Mantener disponible el MySQL legacy en `127.0.0.1:3307`.
4. Instalar dependencias:

```bash
npm i
```

5. Migrar datos:

```bash
npm run db:migrate
npm run db:verify
```

6. Levantar Next.js:

```bash
npm run dev
```

Abrir `http://localhost:3001/erp/login`.

Credenciales locales iniciales:

- Email: `admin@example.com`
- Password: `admin123`

## Seguridad

No subir `.env.local`, dumps SQL, respaldos, ni datos reales de clientes. La migracion lee desde MySQL local o desde una fuente configurada por variables de entorno.

## Produccion desde cero

Para una BD limpia en Supabase:

1. Crear proyecto Supabase.
2. Copiar el connection string Postgres/Pooler. Para Vercel conviene usar el pooler de Supabase.
3. Crear un `.env.production.local` temporal con:

```bash
DATABASE_URL="postgresql://..."
PGSSLMODE=require
RESET_EMPTY_DB_CONFIRM=SI
ADMIN_EMAIL="admin@example.com"
ADMIN_NAME="Admin"
ADMIN_PASSWORD="cambia-este-password"
SESSION_SECRET="solo-para-local"
```

4. Ejecutar:

```bash
npm run db:setup-empty:prod
npm run db:verify:prod
```

El script reinicia las tablas y crea datos base: usuario admin, estados de OT, estados de equipo, equipos/modelos generales, servicios, checklist inicial y tramo financiero base.

En Vercel solo se deben configurar variables de runtime:

```bash
DATABASE_URL="postgresql://..."
PGSSLMODE="require"
SESSION_SECRET="clave-larga-random"
NEXT_PUBLIC_ERP_NAME="MacTech ERP"
```

## Vercel y dominio

La app ya vive bajo `/erp`: la home redirige a `/erp`, las paginas estan en `app/erp` y las APIs en `app/api/erp`.

Para publicar en Vercel:

1. Importar este repo como proyecto independiente `mactech-erp`.
2. Configurar las variables de entorno de produccion indicadas arriba.
3. Hacer deploy de `main`.
4. Probar primero `https://mactech-erp.vercel.app/erp/login`.

Para usar tu dominio actual:

- Opcion simple: crear un subdominio como `erp.mactech.cl` y apuntarlo al proyecto `mactech-erp` en Vercel.
- Opcion `/erp`: mantener `mactech.cl` en el proyecto actual y agregar un rewrite/proxy en ese proyecto hacia `https://mactech-erp.vercel.app/erp`.

Ejemplo en el proyecto que hoy sirve `mactech.cl`:

```js
// next.config.mjs
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/erp/:path*",
        destination: "https://mactech-erp.vercel.app/erp/:path*"
      },
      {
        source: "/api/erp/:path*",
        destination: "https://mactech-erp.vercel.app/api/erp/:path*"
      }
    ];
  }
};

export default nextConfig;
```

Vercel no asigna un dominio directamente a un path como `mactech.cl/erp`; esa ruta debe resolverse con rewrite desde el proyecto principal o usando un subdominio.
