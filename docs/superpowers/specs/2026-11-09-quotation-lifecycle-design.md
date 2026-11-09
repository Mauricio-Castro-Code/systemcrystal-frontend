# Cotizaciones activas y duplicación

Aprobado por el usuario: ocultar las cotizaciones del listado de activas al cumplirse tres días después de la fecha del evento y permitir duplicarlas desde su detalle.

## Alternativas
Eliminar automáticamente perdería información. Se elige ocultar en el listado, conservando los registros y su acceso por folio. La copia se abre en el formulario existente de nueva cotización; obtiene un folio al guardarse, sin cambiar la original.

## Decisiones de implementación
Usar fechas de calendario locales porque el evento almacena una fecha sin hora. Mantener visibles registros sin fecha. Actualizar el listado cada minuto mientras esté abierto. Conservar los datos de la copia para que el usuario ajuste las fechas antes de guardar. Sin migraciones ni borrados.
