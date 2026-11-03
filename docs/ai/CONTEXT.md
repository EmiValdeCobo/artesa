# CONTEXT — estado vivo del proyecto (máx. 60 líneas; actualizar al cerrar tareas)
Actualizado: 2026-11-03

## Meta y fechas
Defensas desde el 2026-11-18. Entregables: sistema funcional en GitHub, IEEE, manual de usuario, doc técnica, flujo de trabajo.

## Decisiones tomadas
- Stack: Express + Sequelize (conductor `pg`) + PostgreSQL 16; React + Vite + Tailwind (sin Next.js); JS puro.
- Lógica de negocio crítica en funciones PL/pgSQL (ver DB_MAP.md). Backend las invoca.
- Precios incluyen IVA (13%); se desglosa en la factura. (Confirmar con docente si el CCF suma IVA aparte.)
- Facturación electrónica DTE simulada (número de control, código de generación, sello simulado).
- RBAC dinámico: roles y permisos en BD; middleware `requirePermiso`.
- CRUD: modelos Sequelize; funciones SQL y vistas con consultas parametrizadas. Migraciones/seeders: `psql` mediante scripts del proyecto.
- Secretos: Docker exige `POSTGRES_*` y `JWT_SECRET` desde `.env`; los archivos `.env.example` solo contienen marcadores no utilizables.

## Estado por módulo
| Módulo | BD | Backend | Frontend |
|---|---|---|---|
| auth / seguridad | listo | login, roles y usuarios con asignación de sucursales | portales admin/cliente, gestión de roles/permisos y CRUD de usuarios |
| inventario | listo | pendiente | pendiente |
| pos | listo | pendiente | pendiente |
| caja | listo | pendiente | pendiente |
| compras | listo | pendiente | pendiente |
| rrhh | listo | pendiente | pendiente |
| reportes | vistas listas | pendiente | pendiente |

## Pendientes críticos
- Verificar tablas de renta/ISSS/AFP vigentes con Hacienda (están en `rrhh.tramos_renta` y `empresa.parametros`).
- Asignar responsables por módulo (ver README).
- Cambiar contraseñas semilla (`Cambiar123*`) antes de desplegar.
