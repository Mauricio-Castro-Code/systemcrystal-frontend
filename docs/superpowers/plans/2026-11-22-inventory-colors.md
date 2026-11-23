# Inventario con colores — plan de implementación

**Spec:** ../specs/2026-11-22-inventory-colors.md
**Objetivo:** precio único por equipo principal y selección de colores registrados, conservando histórico.
**Stack:** Django/DRF, openpyxl, Angular Material/Vitest.

- [x] Backend: estructura de colores, estados y enlaces de consolidación; validación de notas, presentación y exportación; analítica por identidad con fallback histórico; Excel compatible; reorganización con vista previa firmada y confirmación atómica.
- [x] Inventario frontend: administrar colores y existencias; configurar reorganización explícita con revisión/confirmación; conservar importación de Excel y precios compartidos.
- [x] Nueva nota: campo Color por equipo con autocomplete de registrados y bloqueo de texto libre; conservar precio común, IDs y snapshots al editar, duplicar y ver notas.
- [x] Pruebas RED→GREEN de selección/validación, guardado/lectura, historial y precio compartido; suites completas, migraciones y build; revisión integrada.

## Review focus
Ninguna consolidación automática de datos reales; antiguas notas sin cambio de textos/precios; identidad conservada tras edición; color de otro equipo rechazado; cantidades derivadas sin dobleconteo; seis familias exclusivamente; token obsoleto/no autorizado rechazado; vista previa no escribe.

## Verificación final
- Backend151/151 pruebas aprobadas;28 nuevas de colores/agrupación/Excel/analítica/rendimiento. `makemigrations --check --dry-run --settings=config.test_settings` sin cambios.
- Frontend127/127 pruebas aprobadas en19 archivos. Build producción correcto, advertencias SCSS de presupuesto existentes y aumento del inventario a6.66kB.
- Revisión independiente: corregidas duplicaciones de familia antigua sin color y variantes sin ID; IDs/snapshots no se pierden. Productos desconocidos sólo se agrupan por nombre exactamente normalizado, sin fusionar tamaños/modelos por similitud. Colores desconocidos ambiguos se omiten hasta revisar.
- Protección de stock: cantidades antiguas sin distribución no se dejan en cero por importar/precios; configuración manual requiere revisar el total y Excel exige distribución explícita.
- Rendimiento: catálogo una vez por listado, colores prefetched para exportar/importar/confirmar; pruebas de consultas.
- No se ejecutó migración ni agrupación sobre datos reales. La migración0021 agrega estructura y el arranque de backend ya aplica migraciones pendientes al desplegar.
- Excel: hojaColores requiere equipo ya creado conID; renombrar colores conservandoID se hace en editorColores, Excel agrega/actualiza por nombre.
- Publicación requiere autorización disponible para los commits concretos.
