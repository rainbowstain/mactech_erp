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
