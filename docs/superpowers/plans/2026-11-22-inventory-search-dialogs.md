# Inventario: búsqueda y diálogos

**Spec:** ../specs/2026-11-22-inventory-search-dialogs.md
**Stack:** Angular Material, RxJS, Vitest.

- [x] Pruebas RED para pantalla inicial vacía, umbral de búsqueda, categoría combinada/limpieza, alta/edición modal, cancelar importación y permisos.
- [x] Reorganizar plantilla/estilos: tres botones, buscador/filtro, estados y tabla condicional; formularios existentes en templates de MatDialog.
- [x] Conectar ciclo de diálogos y paginador/sort dinámicos; conservar confirmación segura y errores al importar, agrupar y editar colores.
- [x] Suite completa y compilación; revisión de regresiones y commit concreto para publicación con cambios pendientes de colores.

## Casos de revisión
No aparecen productos por defecto; categorías y búsqueda son intersección; clientes sin permisos no mutan; cancelar no guarda ni reutiliza tokens viejos; modal busy no se cierra accidentalmente; resultados paginados después de crearse el ViewChild; colores e importación previos no se pierden.

## Validación final
133 pruebas aprobadas en 19 archivos. Pruebas específicas del nuevo ciclo: búsqueda desde dos caracteres, categoría combinada, tabla/paginador dinámicos con 20 elementos, alta y cancelación en modal, bloqueo de cierre durante escritura e invalidación inmediata del token antes de terminar la animación al cerrar.

Compilación de producción correcta; persisten advertencias de presupuesto SCSS (Inventario 7.55 kB). Revisión independiente sin regresiones materiales. La revisión visual local no se completó porque el navegador estaba en uso; se cerraron los servidores temporales con datos ficticios. No se modificaron registros reales.

Quedan pendientes de publicación este commit, el frontend de colores e50c8c0 y el backend 3472dd6. La revisión automática bloqueó previamente ese backend y exige autorización específica antes de publicar el conjunto.
