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
2. Copiar el connection string Postgres/Pooler.
3. Crear un `.env.local` temporal con:

```bash
DATABASE_URL="postgresql://..."
RESET_EMPTY_DB_CONFIRM=SI
ADMIN_EMAIL="admin@example.com"
ADMIN_NAME="Admin"
ADMIN_PASSWORD="cambia-este-password"
SESSION_SECRET="solo-para-local"
```

4. Ejecutar:

```bash
npm run db:setup-empty
```

El script reinicia las tablas y crea datos base: usuario admin, estados de OT, estados de equipo, equipos/modelos generales, servicios, checklist inicial y tramo financiero base.

En Vercel solo se deben configurar variables de runtime:

```bash
DATABASE_URL="postgresql://..."
SESSION_SECRET="clave-larga-random"
```
