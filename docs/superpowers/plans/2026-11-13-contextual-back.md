# Regreso contextual — plan

**Objetivo:** corregir destinos fijos y asegurar regreso superior visible.
**Spec:** ../specs/2026-11-13-contextual-back.md
**Stack:** Angular Router, Location, signals, Vitest.

- [x] Probar servicio con Inicio→nota→editar→volver→volver, archivo/clientes, navegador atrás/adelante, URL directa, navegación cancelada, reemplazo al guardar y aislamiento de sesión.
- [x] Implementar historial interno y fallback seguro y registro al arranque.
- [x] Agregar barra superior común responsive, quitar duplicados y conectar páginas a navegación contextual.
- [ ] Suite completa, build producción y revisión; preparar commit y publicar únicamente dentro de autorización disponible.

## Casos de revisión
Historial real conserva posición/consultas; no se vuelve al login ni fuera del sitio; guardado no retorna al editor; permisos y cambios cancelados no alteran historial; estado se limpia con sesión; cabecera móvil no oculta botón.

## Validación
109/109 pruebas aprobadas en18 archivos. Incluye servicio con navegación nativa simulada, consultas de archivo, adelante/atrás, guardas canceladas, orígenes de clientes y enlaces sin historial conocido; barra compartida probada con clic real en el DOM y flujos de edición exitosos/fallidos.

Build de producción correcto. Mantiene advertencias previas de presupuesto SCSS. Revisión independiente sin hallazgos importantes. Se ajustó el offset del resumen fijo para no quedar debajo de la nueva barra y el espaciado superior móvil del editor.

Publicación pendiente de autorización específica del commit si la revisión automática la exige. No se modificaron registros ni base de datos.
