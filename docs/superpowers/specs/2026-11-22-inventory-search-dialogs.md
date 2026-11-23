# Inventario enfocado en búsqueda

Diseño aprobado: mantener línea Crystal azul/verde y tarjetas limpias. Al abrir inventario no mostrar productos; buscar desde dos caracteres o seleccionar categoría, combinables. Tres acciones principales: Importar, Exportar y Agregar. Agregar/editar en modal, importar con archivo y revisión en modal; colores/reorganizar/desactivar desde acciones de un resultado. No perder las confirmaciones, controles de stock e historial preparados en el trabajo anterior.

Estados: inicial con guía, búsqueda sin coincidencias distinta de inicial, carga/error explícitos. Paginar/ordenar resultados al aparecer dinámicamente. Tras guardar mostrar equipo creado/actualizado. Permisos de administración conservados. Modales accesibles con título, foco y cancelación; no cerrar mientras se confirma una operación que escribe datos. Cancelar/reabrir importación o agrupación invalida cualquier respuesta/token anterior.

Alternativa descartada: cargar todos los productos o mantener formularios administrativos siempre abiertos. Se mantienen los servicios existentes y se presentan sus flujos en diálogos, evitando reescribir lógica de importación/colores.

Ampliación solicitada por el usuario: todas las tablas paginadas (Inventario, Clientes, Cotizaciones activas, Notas activas y Registro) abren con20 elementos y opciones10,20,50,100. La agenda de Inicio es un tablero de tarjetas y conserva su configuración.
