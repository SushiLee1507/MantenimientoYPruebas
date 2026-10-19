# Universidad Social — Módulo de Eventos Sociales

## Usuarios de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Estudiante | ana.rodriguez@utp.ac.pa | estudiante123 |
| Profesora | maria.gonzalez@utp.ac.pa | profesor123 |
| **Administradora de eventos sociales (nuevo)** | lourdes.batista@utp.ac.pa | admin12345 |

> Si ya habías abierto la versión anterior, los datos se regeneran solos (la semilla pasó a `version: 2`).
> Las fechas de los eventos de prueba se calculan a partir del día de hoy, así la demo siempre tiene convocatorias vigentes.

## Requerimientos obligatorios

| Requerimiento | Dónde está | Qué hace |
|---|---|---|
| **RF-04** Postulación de actividades sociales | Profesor → *Eventos sociales → Postular actividad* | Formulario con validación: nombre, tipo, lugar, fecha (mínimo 3 días de anticipación), horario (fin > inicio), cupo (1–200), horas (≤ duración), descripción (≥ 30 caracteres), encargado y documento (PDF/JPG/PNG ≤ 2 MB). La propuesta queda **En evaluación**; puede retirarse mientras no sea evaluada y, si se rechaza, “Postular de nuevo” copia los datos. |
| **RF-05** Evaluación de propuestas | Admin → *Propuestas → Pendientes → Evaluar* | Ficha completa y observaciones. **Rechazar** exige un motivo (mín. 10 caracteres). Se notifica al proponente por mensaje. |
| **RF-06** Publicación de actividades aprobadas | Admin → *Evaluar → Aprobar* (con “Publicar al aprobar”) o *Propuestas → Aprobadas sin publicar → Publicar* | La actividad aparece en las convocatorias del estudiante y se crea un **aviso general** automático. |
| **RF-07** Inscripción de estudiantes | Estudiante → *Eventos sociales → Inscribirme* | Modal de responsabilidades, luego el formulario con recibo de matrícula obligatorio. La solicitud queda **Pendiente** y reserva cupo. |
| **RF-08** Inscripción duplicada | Formulario de inscripción y capa de datos (`US.validarInscripcionEvento`) | Bloquea inscribirse dos veces en la misma actividad, incluso si la solicitud fue rechazada; también bloquea actividades llenas, cerradas, ya realizadas o que coinciden en fecha y hora con otra. La regla se vuelve a validar justo antes de guardar (doble clic / dos pestañas). El admin tampoco puede agregar duplicados. |
| **RF-10** Gestión de estudiantes postulados | Admin → *Eventos sociales → Gestionar* | Lista con búsqueda y filtro por estado; **Aceptar**, **Rechazar** (con motivo), **Quitar**, **Agregar estudiante manualmente**, **Aceptar todos los pendientes** y **Descargar CSV**. Cada acción notifica al estudiante. |

## Extras añadidos

- **RF-09 Cierre de convocatoria:** irreversible; rechaza automáticamente las solicitudes pendientes y deja la lista en solo lectura.
- **RF-16 Horas sociales:** el estudiante ve sus horas acumuladas, su historial y su próxima actividad.
- **RF-18 Validación de archivos:** extensión y tipo MIME (PDF/JPG/PNG), archivo no vacío y máximo 2 MB.
- Contadores en el menú del admin (propuestas por evaluar, solicitudes por revisar).
- Resúmenes de eventos en el *Inicio* del estudiante y del profesor.
- La administradora puede publicar avisos generales y recibir mensajes de estudiantes y profesores.
- Diseño adaptable: probado en 390 px (móvil) y de 1200 a 1440 px.

## Archivos

| Archivo | Cambio |
|---|---|
| `admin.html`, `js/admin.js` | **Nuevos.** Panel del administrador de eventos sociales. |
| `js/eventos.js` | **Nuevo.** Reglas de negocio (RF-04 a RF-10) y vistas de estudiante y profesor. |
| `js/datos.js` | Usuaria administradora, eventos, solicitudes y horas de prueba. |
| `js/almacen.js` | Rol `administrador`, redirección por rol, contadores en el menú, modales con validación. |
| `js/estudiante.js`, `js/profesor.js` | Pestaña *Eventos sociales* y resumen en el inicio. |
| `js/mensajes.js` | Avisos generales (para la administradora). |
| `css/estilos.css` | Estilos de tarjetas de eventos, archivos y barras de cupo (misma paleta). |
| `index.html`, `js/login.js` | Botón de usuario de prueba para la administradora. |

## Nota sobre archivos adjuntos

Esta versión guarda los datos en el navegador (`localStorage`), así que de los archivos solo se guarda el **nombre, el tamaño y el tipo**; el contenido no se sube. En la versión con servidor, este es el punto donde se enviaría el archivo al backend.
