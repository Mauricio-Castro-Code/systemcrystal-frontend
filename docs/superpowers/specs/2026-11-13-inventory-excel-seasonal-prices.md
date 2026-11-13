# Inventario por Excel y tarifas de temporada

El usuario aprobó exportar el inventario, completar o agregar equipos en Excel e importar con vista previa de altas, actualizaciones y errores. Agregar costo de reposición y precio de temporada alta por equipo.

## Diseño aprobado
Columnas: Equipo, Categoría, Cantidad, Precio normal de renta, Precio temporada alta, Costo de reposición. Incluir ID estable para actualizar productos existentes sin duplicar. Descargar .xlsx con instrucciones y categorías; importar únicamente al confirmar una vista previa válida. No eliminar productos ausentes del archivo. Validar el archivo completo antes de guardar, con operación atómica y detección de cambios desde la vista previa.

Temporada alta anual del 15 de noviembre al 1 de enero, ambos incluidos, según la fecha del evento. Sin tarifa alta se usa la normal; cero sí es una tarifa válida. Cambiar la fecha en un formulario nuevo ajusta precios asignados automáticamente. Respetar precios modificados manualmente y cotizaciones/pedidos previamente guardados. No actualizar documentos al cambiar el catálogo.

## Alternativas
Se elige una sola plantilla con ambas tarifas frente a dos listas independientes: mantiene una sola identidad por equipo y facilita el llenado. Se elige vista previa y confirmación frente a escritura inmediata para evitar cargas accidentales y detectar errores antes de guardar.

## Alcance técnico
Django: campos high_season_price y replacement_cost, migración, exportador y servicio de importación. Angular: formulario y tabla de inventario, descarga, selección de archivo, vista previa, confirmación y resolución de tarifa en cotizaciones.
