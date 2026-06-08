# Prompt maestro: MacTech ERP independiente en Next.js

Actua como Codex, senior full-stack engineer. El objetivo es construir un ERP nuevo para MacTech como proyecto independiente, listo para subir a GitHub y desplegar en Vercel.

## Regla principal

Este proyecto nuevo vive en:

`/Users/eduardo/mactech-erp`

No debe vivir dentro del repo antiguo `/Users/eduardo/mactech`.

El repo `/Users/eduardo/mactech` se considera legacy/landing actual. Puede usarse como referencia, pero no debe contener el ERP nuevo ni datos sensibles para GitHub.

## Stack objetivo

- Next.js
- React
- Supabase
- Postgres
- Vercel
- CSS moderno y mantenible

El ERP debe poder desplegarse en Vercel como proyecto independiente. Luego se podra conectar a `mactech.cl/erp` mediante configuracion de dominio, rewrite, subpath o la estrategia que corresponda, pero primero debe funcionar localmente.

## Contexto legacy

Existe un ERP antiguo recuperado en:

`/Users/eduardo/mactech/local-legacy`

Ese sistema antiguo sirve solo como referencia funcional y fuente de datos:

- Frontend Vue compilado: `/Users/eduardo/mactech/local-legacy/frontend`
- Backend Node/Express/Sequelize: `/Users/eduardo/mactech/local-legacy/backend`
- Dumps MySQL: `/Users/eduardo/mactech/local-legacy/database`
- MySQL local Docker: puerto `3307`

No subir `local-legacy` a GitHub.
No copiar dumps SQL con datos reales al repo nuevo.
No subir `.env`, secretos, datos de clientes ni respaldos.

## Objetivo inicial

Primer hito local, sin deploy:

1. Abrir el ERP nuevo localmente en Next.js.
2. Tener login funcional.
3. Ver dashboard.
4. Ver listado de ordenes de trabajo migradas.
5. Abrir detalle de una OT historica.
6. Confirmar que la landing antigua no se toca.

No desplegar a Vercel hasta que esto funcione en local.

## Estrategia

No hacer un big bang. Primero replicar el flujo esencial del ERP viejo y despues modernizar modulo por modulo.

La UI inicial debe parecerse bastante al ERP legacy para no cambiar de golpe la operacion del taller. Despues se pueden aplicar mejoras visuales y funcionales.

## Fases

### Fase 0: auditoria

Antes de programar nuevas funciones:

- Revisar estructura de `/Users/eduardo/mactech-erp`.
- Revisar el ERP viejo solo como referencia.
- Inventariar tablas relevantes del MySQL legacy:
  - users
  - clientes
  - ordenes
  - equipos
  - dispositivos
  - estados_ordenes
  - servicios
  - orden_has_servicios
  - preguntas
  - respuestas
  - revisiones
  - garantias
- Detectar campos ambiguos y relaciones.
- Documentar mapeo MySQL -> Postgres/Supabase.

### Fase 1: proyecto independiente Next.js

Crear o completar el proyecto Next.js en `/Users/eduardo/mactech-erp`.

Debe tener:

- `package.json` propio.
- `app/` de Next.js.
- rutas del ERP bajo `/erp`.
- estilos propios.
- scripts propios.
- `.env.local` solo local e ignorado por Git.
- `.gitignore` que excluya datos sensibles.

### Fase 2: base de datos Supabase/Postgres

Crear schema Postgres compatible con Supabase.

Requisitos:

- Preservar IDs historicos donde tenga sentido.
- Crear indices para consultas de OT.
- Preparar RLS para Supabase.
- Separar schema/migraciones de datos reales.
- No subir datos reales al repo.

### Fase 3: migracion local

Migrar desde MySQL local a Postgres local o Supabase local/remoto de desarrollo.

Validar:

- conteos por tabla.
- OT con cliente, equipo, dispositivo y estado.
- respuestas de checklist.
- servicios asociados.
- fechas y montos.

### Fase 4: login

Implementar login para el primer hito.

Preferencia final:

- Supabase Auth.

Opcion temporal aceptable para primer hito local:

- login contra tabla `users` migrada, con bcrypt y cookie segura local.

Nunca hardcodear secretos en codigo.

### Fase 5: pantallas iniciales

Implementar en este orden:

1. `/erp/login`
2. `/erp` dashboard
3. `/erp/ordenes` listado de OT
4. `/erp/ordenes/[id]` detalle de OT
5. vista imprimible de OT si cabe en el hito

Cada vista debe manejar:

- loading
- error
- estado vacio
- datos reales migrados
- responsive basico

### Fase 6: pruebas locales

Antes de considerar GitHub/Vercel:

- instalar dependencias.
- levantar base local.
- migrar datos.
- levantar `npm run dev`.
- probar login.
- abrir `/erp`.
- abrir listado de OT.
- abrir detalle de OT historica.
- ejecutar `npm run build`.
- revisar consola del navegador.

### Fase 7: GitHub y Vercel

Solo despues de pruebas locales:

- crear repo GitHub independiente para `mactech-erp`.
- revisar `.gitignore`.
- confirmar que no se sube `local-legacy`, dumps SQL, `.env.local` ni datos reales.
- configurar variables en Vercel.
- conectar Supabase.
- desplegar.
- probar login y OT en produccion.

## Criterio de exito del primer hito

El primer hito esta listo cuando:

- `/Users/eduardo/mactech-erp` es independiente.
- `npm run dev` levanta Next.js.
- `http://localhost:<puerto>/erp/login` abre login.
- admin puede iniciar sesion.
- dashboard carga sin errores fatales.
- se ven OT migradas.
- se puede abrir una OT historica.
- `npm run build` pasa.
- el repo viejo `/Users/eduardo/mactech` no fue modificado para alojar el ERP nuevo.

## Prompt corto para retomar

Construye el ERP nuevo de MacTech como proyecto independiente en `/Users/eduardo/mactech-erp` usando Next.js + React + Supabase/Postgres. Usa `/Users/eduardo/mactech/local-legacy` solo como referencia y fuente de migracion, pero no metas el ERP nuevo dentro del repo viejo ni subas datos legacy. Primero haz funcionar localmente `/erp/login`, `/erp`, listado de OT y detalle de OT con datos migrados. No despliegues a Vercel hasta probar local y pasar build.
