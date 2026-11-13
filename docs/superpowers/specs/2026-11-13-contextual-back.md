# Navegación de regreso contextual

Problema: detalle de notas y cotizaciones manda siempre a un listado fijo; editar no ofrece regreso visible arriba. El usuario pide volver al lugar desde el que llegó y tener ese control fijo en la parte superior.

## Comportamiento
Un botón común en el layout, visible al desplazarse, vuelve a la entrada interna anterior: Inicio→nota→editar vuelve nota→Inicio. Conservar rutas de archivo, consultas y posición al usar historial real. Aplicar también a clientes y módulos sin botón de regreso. Ocultar en Inicio, Mi ruta y acceso. Para enlaces directos o recarga sin historial conocido, usar destino seguro de la sección; nunca salir de la aplicación hacia páginas externas ni acceso.

Al guardar cambios desde edición, volver al detalle previo si ya estaba inmediatamente antes; si se entró directamente al editor, reemplazar esa entrada por el detalle. Evitar bucles de editor/detalle. Historial aislado por sesión; sin registrar datos sensibles ni modificar registros al navegar.

## Implementación
Servicio root observa navegación desde el arranque. Barra común sticky en main-layout, debajo de la cabecera móvil. Sustituir los regresos fijos duplicados por el mismo servicio. Pruebas de navegación con Router real y Location de prueba.
