# AGENTS.md (Backend)

## Objetivo
Aplicar enforcement obligatorio de suscripcion, modulo, permiso, owner y readiness Facturapi en cada ruta protegida.

## Reglas obligatorias
- Declarar cada endpoint en `routePolicies` del archivo de rutas.
- Para rutas protegidas, incluir siempre `requireAuth`.
- No escribir logica de autorizacion inline en controladores; usar `src/policies/*`.
- Construir acceso desde `buildAbilityContext` (fuente unica).
- Auditar acciones criticas con `audit(...)`.

## Errores
- Responder con `{ code, message, details? }`.
- Status esperados: `401`, `402`, `403`, `409`, `422`.

## Checklist de PR
- `npm run check:policies`
- `npm run typecheck`
- `npm run test`
- Verificar que no existan rutas de negocio sin policy.