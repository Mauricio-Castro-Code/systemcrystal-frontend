# Inventory Excel and seasonal prices implementation plan

**Goal:** importar y exportar inventario .xlsx con tarifas normal/alta y reposición; elegir tarifa por fecha del evento.
**Spec:** ../specs/2026-11-13-inventory-excel-seasonal-prices.md
**Stack:** Django DRF/openpyxl, Angular/Vitest.
**Execution:** tareas independientes servidor, UI inventario y cotizaciones, con pruebas antes de implementación y revisión integrada.

## Tareas
- [x] Servidor: campos opcionales highSeasonPrice/replacementCost; migración compatible. Exportar Excel con ID y validación de categorías. Vista previa multipart y confirmación con token firmado, vencimiento y protección contra cambios concurrentes. Pruebas permisos, duplicados, errores, atomicidad, creación, actualización y precios históricos intactos.
- [x] UI Inventario: normalizar nuevos campos, formularios, columnas, descargar Excel, elegir archivo, mostrar errores por fila y confirmación, limpiar vistas previas obsoletas y refrescar tras importar. Pruebas de interacción y errores.
- [x] Cotizaciones: resolver precio por fecha del evento, cubrir 14/15 noviembre y 1/2 enero, precio alto nulo/cero, cambios de fecha y precios manuales/guardados conservados.
- [x] Integración: suites completas backend/frontend, migraciones sin diferencias, compilación producción, revisión de cambios y estado de repositorios.

## Review focus
No pérdida de inventario en importación; IDs y nombres ambiguos no sobreescriben equipos; dinero y categorías inválidos; preview no modifica datos; cotizaciones existentes y precios manuales preservados; vigencia inclusiva al cruzar año.

## Verificación final
- Backend: 123 pruebas aprobadas, incluyendo 14 de Excel; `makemigrations --check --dry-run --settings=config.test_settings` sin cambios.
- Frontend: 70 pruebas aprobadas en 15 archivos; compilación de producción correcta. Advertencias de presupuesto en SCSS existentes sin modificar.
- Revisión independiente: corregida la pérdida de seguimiento de tarifa automática al deshacer una eliminación (prueba RED→GREEN). Se conservan filas manuales e históricas.
- Regresiones adicionales: límite de 5000 filas en exportación/importación compatible; nombres con apóstrofes o signos de fórmula preservados como texto seguro.
- No se alteró la base de datos real. Migración 0020 incluida; el arranque de gunicorn ya ejecuta migraciones pendientes.
