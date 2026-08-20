# Changelog

Todos los cambios relevantes de Entropi se documentan en este archivo.

## 0.1.3 — 2026-08-20

### Novedades

- Relaciones flexibles entre notas, materias y otros elementos, con selector compacto y sugerencias contextuales.
- Carpetas de notas administradas automáticamente por semestre y materia.
- Glosarios globales y contextuales con ejemplos, coincidencias sin distinguir mayúsculas y consulta de usos.
- Bookmarks de bloques con biblioteca global, guardado inmediato, navegación y resaltado del contenido.
- Callouts personalizables y bloques anidados con comandos `/`, matemáticas y salida mediante Enter.
- Tipografías personalizadas, ligaduras y elección entre fuentes monoespaciadas o proporcionales.
- Barra lateral de utilidades para relaciones, ayuda y bookmarks, junto al estado de guardado en la navegación.

### Correcciones

- Recuperación automática de notas creadas durante el experimento de columnas, devolviendo sus bloques al documento normal.
- Selector de lenguaje estable y corrección ortográfica desactivada dentro de bloques de código.
- Mejoras en menús de bloque, acciones anidadas, sugerencias ortográficas y navegación de carpetas.

### Mantenimiento

- Migración completa del proyecto y del pipeline de publicación a pnpm.
- Migraciones de base de datos incluidas para conservar la información existente al actualizar.
