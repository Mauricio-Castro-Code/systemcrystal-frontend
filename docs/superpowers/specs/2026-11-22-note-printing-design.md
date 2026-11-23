# Impresión pendiente de notas

## Objetivo
Evitar que una nota autorizada quede sin seguimiento de impresión. Conservar la línea visual de Crystal y el indicador actual de nota impresa.

## Flujo propuesto
1. Al confirmar una cotización o crear una nota confirmada, mostrar «Esperando impresión de la nota» con su folio.
2. Ofrecer «Abrir PDF e imprimir» y «Confirmar nota impresa». Abrir el PDF o cerrar el diálogo de impresión del navegador no confirma la impresión física.
3. El aviso no se cierra con Escape ni al pulsar fuera. Solo termina al guardar la confirmación o posponer expresamente.
4. Permitir a administradores «Posponer impresión», solicitando un motivo. Posponer conserva el estado pendiente, sin marcar impresa la nota.
5. Mostrar las notas pospuestas en una sección visible de pendientes con la acción «Retomar impresión». Conservar los pendientes al recargar o volver a iniciar sesión.
6. Una edición que invalida la impresión vuelve a requerirla. No imponer el aviso retroactivamente a todas las notas antiguas sin marca de impresión.

## Alternativas
- Bloquear hasta imprimir: evita omisiones, pero impide continuar ante problemas de impresora.
- Aviso descartable: permite continuar, pero reproduce el riesgo de dejar notas en el limbo.
- Aviso obligatorio con posposición registrada: opción elegida al permitir posponer; mantiene seguimiento y permite resolver fallas operativas.

## Implementación y verificación
Persistir el requerimiento de impresión y la posposición en el servidor; mantenerlos separados del indicador `printed_at` existente. Controlar permisos, errores de guardado y cambios concurrentes de la nota. Comprobar confirmación, posposición, recuperación tras recarga y ausencia de bloqueo retroactivo. El navegador requiere confirmación manual de la impresión física.

## Pendiente de aprobación
El permiso de posponer reservado a administradores y el motivo obligatorio son la propuesta presentada para resolver fallas de impresión.
