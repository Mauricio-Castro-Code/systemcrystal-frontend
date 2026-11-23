# Equipos con colores registrados

El usuario aprobó seleccionar un equipo principal y después un campo de color que admite únicamente colores registrados. Los precios son iguales para todos los colores. Aplicar a: Mantel para tablón, Mantel redondo, Cubremantel, Servilletas, Mantel para sombrilla y Bandas. Otros manteles/productos permanecen individuales.

## Reglas
- Precios normal, temporada alta y reposición pertenecen al equipo principal.
- Existencias por color; cantidad total del equipo es la suma de colores.
- La nota guarda ID de equipo, ID de color y texto de color, además del nombre/precio/cantidad históricos.
- Corregir pérdida de productId al normalizar notas para que la identidad sobreviva edición/duplicación.
- Reorganizar variantes actuales sólo con vista previa y confirmación explícita. Mantenerlas inactivas y enlazadas, sin borrarlas ni alterar notas antiguas.
- Los análisis usan equipo/color identificados. Las líneas históricas sin ID pueden enlazarse por equivalencia exacta de un nombre anterior revisado; nunca adivinar colores ambiguos ni mezclar otros tipos de mantel.
- Inventario/Excel permiten administrar colores, precios y cantidades. Precio se actualiza sólo en el equipo.

## Alternativas
Conservar un producto por color mantiene precios duplicados y fue descartado por el usuario. Se elige equipo principal y catálogo de colores con existencias; la UX de la nota sólo agrega el campo Color debajo del nombre.

## Protección de datos
Migraciones sólo agregan estructura. No ejecutar reorganizaciones ni migraciones sobre la base real durante desarrollo. Toda consolidación de catálogo tendrá confirmación, token firmado con vencimiento y control de cambios concurrentes.
