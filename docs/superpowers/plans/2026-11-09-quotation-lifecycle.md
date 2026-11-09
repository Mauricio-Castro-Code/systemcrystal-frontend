# Cotizaciones: plan de implementación

**Objetivo:** ocultar cotizaciones vencidas y abrir copias editables desde el detalle.
**Arquitectura:** filtrar únicamente el listado, conservando el estado del servicio. Usar un parámetro distinto para copiar cotizaciones y mantener la duplicación de pedidos existente.
**Stack:** Angular, TypeScript, Vitest.
**Diseño:** ../specs/2026-11-09-quotation-lifecycle-design.md

## Tareas
- [x] Probar el listado antes, durante y después del límite de tres días, sin fecha y con cambio de día mientras está abierto.
- [x] Filtrar por fecha del evento y actualizar el reloj cada minuto; no borrar registros.
- [x] Probar la carga de una copia en un formulario nuevo sin modificar ni guardar la original.
- [x] Agregar el botón en el detalle y el parámetro duplicarCotizacionDe en Nueva cotización. Reutilizar la carga del formulario.
- [x] Ejecutar pruebas completas, compilar, revisar diff, hacer commit y push a origin/main.

## Casos de revisión
Límite exacto de tres días, cambios de mes/año, fechas nulas, registro original intacto, duplicación de pedidos conservada.

## Validación
48/48 pruebas aprobadas con npm test -- --watch=false. Compilación de producción aprobada fuera del sandbox (el sandbox interrumpía Node con código 134). Advertencias de presupuesto en SCSS existentes sin modificar. Revisión independiente sin hallazgos importantes.
