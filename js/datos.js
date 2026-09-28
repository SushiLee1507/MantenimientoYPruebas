/* ==========================================================================
   Universidad Social — Datos de demostración (semilla)
   En esta entrega (avance) los datos viven en el navegador (localStorage).
   En la versión final se reemplazan por la base de datos del servidor.
   ========================================================================== */
window.US_SEED = {
  version: 1,

  config: {
    periodoActual: 'II Semestre 2026',
    periodoAnterior: 'I Semestre 2026',
    inscripcionAbierta: true,
    cierreInscripcion: '2026-10-09',
    maxCreditos: 22
  },

  /* Ponderación de la nota final (suma 100 %) */
  ponderacion: { p1: 0.20, p2: 0.20, proyecto: 0.25, semestral: 0.35 },

  usuarios: [
    { id: 'e1', rol: 'estudiante', nombre: 'Ana Sofía Rodríguez', correo: 'ana.rodriguez@utp.ac.pa', password: 'estudiante123', cedula: '8-1001-2345', carrera: 'Lic. en Ingeniería de Software', anio: 3 },
    { id: 'e2', rol: 'estudiante', nombre: 'Carlos Mendoza', correo: 'carlos.mendoza@utp.ac.pa', password: 'estudiante123', cedula: '8-1002-3456', carrera: 'Lic. en Ingeniería de Software', anio: 3 },
    { id: 'e3', rol: 'estudiante', nombre: 'Valeria Castillo', correo: 'valeria.castillo@utp.ac.pa', password: 'estudiante123', cedula: '4-812-1190', carrera: 'Lic. en Ingeniería de Software', anio: 3 },
    { id: 'e4', rol: 'estudiante', nombre: 'Luis Herrera', correo: 'luis.herrera@utp.ac.pa', password: 'estudiante123', cedula: '2-755-1023', carrera: 'Lic. en Ingeniería de Software', anio: 3 },
    { id: 'p1', rol: 'profesor', nombre: 'María González', correo: 'maria.gonzalez@utp.ac.pa', password: 'profesor123', departamento: 'Ingeniería de Software' },
    { id: 'p2', rol: 'profesor', nombre: 'Roberto Díaz', correo: 'roberto.diaz@utp.ac.pa', password: 'profesor123', departamento: 'Computación y Redes' },
    { id: 'p3', rol: 'profesor', nombre: 'Elena Vargas', correo: 'elena.vargas@utp.ac.pa', password: 'profesor123', departamento: 'Ciencias Básicas y Humanidades' }
  ],

  /* Cada registro es un grupo (sección) de una materia en un periodo.
     dia: 1 = lunes … 6 = sábado */
  grupos: [
    // ---------- II Semestre 2026 (periodo actual) ----------
    { id: 'g1', codigo: 'ISF-3101', nombre: 'Ingeniería de Software II', creditos: 4, profesorId: 'p1', grupo: '1SF131', periodo: 'II Semestre 2026', cupo: 30,
      sesiones: [{ dia: 1, inicio: '08:00', fin: '09:30', aula: '3-201' }, { dia: 3, inicio: '08:00', fin: '09:30', aula: '3-201' }] },
    { id: 'g2', codigo: 'ISF-3102', nombre: 'Bases de Datos II', creditos: 4, profesorId: 'p2', grupo: '1SF131', periodo: 'II Semestre 2026', cupo: 30,
      sesiones: [{ dia: 2, inicio: '08:00', fin: '09:30', aula: '3-105' }, { dia: 4, inicio: '08:00', fin: '09:30', aula: '3-105' }] },
    { id: 'g3', codigo: 'ISF-3103', nombre: 'Desarrollo de Software Web', creditos: 4, profesorId: 'p1', grupo: '1SF131', periodo: 'II Semestre 2026', cupo: 25,
      sesiones: [{ dia: 2, inicio: '10:00', fin: '11:30', aula: 'Lab 3-302' }, { dia: 4, inicio: '10:00', fin: '11:30', aula: 'Lab 3-302' }] },
    { id: 'g4', codigo: 'ISF-3104', nombre: 'Gerencia de Proyectos de Software', creditos: 3, profesorId: 'p3', grupo: '1SF242', periodo: 'II Semestre 2026', cupo: 30,
      sesiones: [{ dia: 1, inicio: '10:00', fin: '11:30', aula: '1-204' }, { dia: 3, inicio: '10:00', fin: '11:30', aula: '1-204' }] },
    { id: 'g5', codigo: 'ISF-3105', nombre: 'Redes de Computadoras', creditos: 4, profesorId: 'p2', grupo: '1SF131', periodo: 'II Semestre 2026', cupo: 25,
      sesiones: [{ dia: 3, inicio: '13:00', fin: '14:30', aula: 'Lab 3-110' }, { dia: 5, inicio: '13:00', fin: '14:30', aula: 'Lab 3-110' }] },
    { id: 'g6', codigo: 'MAT-2201', nombre: 'Estadística Aplicada', creditos: 3, profesorId: 'p3', grupo: '1SF121', periodo: 'II Semestre 2026', cupo: 35,
      sesiones: [{ dia: 1, inicio: '08:00', fin: '09:30', aula: '2-101' }, { dia: 3, inicio: '08:00', fin: '09:30', aula: '2-101' }] },
    { id: 'g7', codigo: 'HUM-1001', nombre: 'Ética Profesional', creditos: 2, profesorId: 'p3', grupo: '1SF111', periodo: 'II Semestre 2026', cupo: 40,
      sesiones: [{ dia: 6, inicio: '08:00', fin: '10:00', aula: '1-105' }] },
    { id: 'g8', codigo: 'ISF-3107', nombre: 'Seguridad Informática', creditos: 3, profesorId: 'p2', grupo: '1SF131', periodo: 'II Semestre 2026', cupo: 3,
      sesiones: [{ dia: 5, inicio: '08:00', fin: '10:00', aula: '3-204' }] },
    { id: 'g9', codigo: 'ISF-3106', nombre: 'Inteligencia Artificial', creditos: 4, profesorId: 'p1', grupo: '1SF131', periodo: 'II Semestre 2026', cupo: 25,
      sesiones: [{ dia: 2, inicio: '13:00', fin: '14:30', aula: 'Lab 3-302' }, { dia: 5, inicio: '10:30', fin: '12:00', aula: 'Lab 3-302' }] },

    // ---------- I Semestre 2026 (periodo anterior, cerrado) ----------
    { id: 'h1', codigo: 'ISF-2101', nombre: 'Ingeniería de Software I', creditos: 4, profesorId: 'p1', grupo: '1SF121', periodo: 'I Semestre 2026', cupo: 30,
      sesiones: [{ dia: 1, inicio: '08:00', fin: '09:30', aula: '3-201' }, { dia: 3, inicio: '08:00', fin: '09:30', aula: '3-201' }] },
    { id: 'h2', codigo: 'ISF-2102', nombre: 'Bases de Datos I', creditos: 4, profesorId: 'p2', grupo: '1SF121', periodo: 'I Semestre 2026', cupo: 30,
      sesiones: [{ dia: 2, inicio: '08:00', fin: '09:30', aula: '3-105' }, { dia: 4, inicio: '08:00', fin: '09:30', aula: '3-105' }] },
    { id: 'h3', codigo: 'ISF-2103', nombre: 'Programación Orientada a Objetos', creditos: 4, profesorId: 'p1', grupo: '1SF121', periodo: 'I Semestre 2026', cupo: 30,
      sesiones: [{ dia: 2, inicio: '10:00', fin: '11:30', aula: 'Lab 3-302' }, { dia: 4, inicio: '10:00', fin: '11:30', aula: 'Lab 3-302' }] },
    { id: 'h4', codigo: 'MAT-1203', nombre: 'Cálculo II', creditos: 4, profesorId: 'p3', grupo: '1SF121', periodo: 'I Semestre 2026', cupo: 35,
      sesiones: [{ dia: 1, inicio: '10:00', fin: '11:30', aula: '2-103' }, { dia: 3, inicio: '10:00', fin: '11:30', aula: '2-103' }] },
    { id: 'h5', codigo: 'HUM-1002', nombre: 'Comunicación Oral y Escrita', creditos: 2, profesorId: 'p3', grupo: '1SF121', periodo: 'I Semestre 2026', cupo: 40,
      sesiones: [{ dia: 5, inicio: '08:00', fin: '10:00', aula: '1-105' }] }
  ],

  inscripciones: [
    // Periodo actual
    { estudianteId: 'e1', grupoId: 'g1', fecha: '2026-08-10' },
    { estudianteId: 'e1', grupoId: 'g2', fecha: '2026-08-10' },
    { estudianteId: 'e1', grupoId: 'g4', fecha: '2026-08-10' },
    { estudianteId: 'e2', grupoId: 'g1', fecha: '2026-08-11' },
    { estudianteId: 'e2', grupoId: 'g3', fecha: '2026-08-11' },
    { estudianteId: 'e2', grupoId: 'g5', fecha: '2026-08-11' },
    { estudianteId: 'e2', grupoId: 'g8', fecha: '2026-08-11' },
    { estudianteId: 'e3', grupoId: 'g1', fecha: '2026-08-10' },
    { estudianteId: 'e3', grupoId: 'g2', fecha: '2026-08-10' },
    { estudianteId: 'e3', grupoId: 'g3', fecha: '2026-08-10' },
    { estudianteId: 'e3', grupoId: 'g7', fecha: '2026-08-10' },
    { estudianteId: 'e3', grupoId: 'g8', fecha: '2026-08-10' },
    { estudianteId: 'e4', grupoId: 'g3', fecha: '2026-08-12' },
    { estudianteId: 'e4', grupoId: 'g4', fecha: '2026-08-12' },
    { estudianteId: 'e4', grupoId: 'g6', fecha: '2026-08-12' },
    { estudianteId: 'e4', grupoId: 'g8', fecha: '2026-08-12' },
    // Periodo anterior
    { estudianteId: 'e1', grupoId: 'h1', fecha: '2026-03-02' },
    { estudianteId: 'e1', grupoId: 'h2', fecha: '2026-03-02' },
    { estudianteId: 'e1', grupoId: 'h3', fecha: '2026-03-02' },
    { estudianteId: 'e1', grupoId: 'h4', fecha: '2026-03-02' },
    { estudianteId: 'e1', grupoId: 'h5', fecha: '2026-03-02' },
    { estudianteId: 'e2', grupoId: 'h1', fecha: '2026-03-03' },
    { estudianteId: 'e2', grupoId: 'h2', fecha: '2026-03-03' },
    { estudianteId: 'e2', grupoId: 'h3', fecha: '2026-03-03' },
    { estudianteId: 'e2', grupoId: 'h4', fecha: '2026-03-03' },
    { estudianteId: 'e2', grupoId: 'h5', fecha: '2026-03-03' },
    { estudianteId: 'e3', grupoId: 'h1', fecha: '2026-03-02' },
    { estudianteId: 'e3', grupoId: 'h2', fecha: '2026-03-02' },
    { estudianteId: 'e3', grupoId: 'h3', fecha: '2026-03-02' },
    { estudianteId: 'e3', grupoId: 'h4', fecha: '2026-03-02' },
    { estudianteId: 'e3', grupoId: 'h5', fecha: '2026-03-02' },
    { estudianteId: 'e4', grupoId: 'h1', fecha: '2026-03-04' },
    { estudianteId: 'e4', grupoId: 'h3', fecha: '2026-03-04' },
    { estudianteId: 'e4', grupoId: 'h4', fecha: '2026-03-04' },
    { estudianteId: 'e4', grupoId: 'h5', fecha: '2026-03-04' }
  ],

  /* Clave: "estudianteId|grupoId". null = evaluación aún no realizada. */
  calificaciones: {
    // Periodo actual: solo se ha realizado el primer parcial en algunas materias
    'e1|g1': { p1: 85, p2: null, proyecto: null, semestral: null },
    'e2|g1': { p1: 72, p2: null, proyecto: null, semestral: null },
    'e3|g1': { p1: 94, p2: null, proyecto: null, semestral: null },
    'e1|g2': { p1: 78, p2: null, proyecto: null, semestral: null },
    'e3|g2': { p1: 88, p2: null, proyecto: null, semestral: null },
    'e2|g3': { p1: 80, p2: null, proyecto: null, semestral: null },
    'e3|g3': { p1: 91, p2: null, proyecto: null, semestral: null },
    'e4|g3': { p1: 68, p2: null, proyecto: null, semestral: null },
    // Periodo anterior (completo)
    'e1|h1': { p1: 88, p2: 92, proyecto: 95, semestral: 90 },
    'e1|h2': { p1: 78, p2: 85, proyecto: 82, semestral: 80 },
    'e1|h3': { p1: 95, p2: 90, proyecto: 98, semestral: 93 },
    'e1|h4': { p1: 70, p2: 65, proyecto: 75, semestral: 72 },
    'e1|h5': { p1: 90, p2: 88, proyecto: 92, semestral: 95 },
    'e2|h1': { p1: 75, p2: 80, proyecto: 85, semestral: 78 },
    'e2|h2': { p1: 60, p2: 55, proyecto: 70, semestral: 58 },
    'e2|h3': { p1: 82, p2: 79, proyecto: 88, semestral: 84 },
    'e2|h4': { p1: 50, p2: 45, proyecto: 60, semestral: 52 },
    'e2|h5': { p1: 85, p2: 90, proyecto: 80, semestral: 88 },
    'e3|h1': { p1: 95, p2: 97, proyecto: 100, semestral: 96 },
    'e3|h2': { p1: 92, p2: 90, proyecto: 94, semestral: 91 },
    'e3|h3': { p1: 88, p2: 85, proyecto: 90, semestral: 87 },
    'e3|h4': { p1: 85, p2: 80, proyecto: 88, semestral: 84 },
    'e3|h5': { p1: 96, p2: 94, proyecto: 98, semestral: 97 },
    'e4|h1': { p1: 70, p2: 72, proyecto: 78, semestral: 74 },
    'e4|h3': { p1: 65, p2: 68, proyecto: 75, semestral: 70 },
    'e4|h4': { p1: 72, p2: 70, proyecto: 76, semestral: 71 },
    'e4|h5': { p1: 80, p2: 82, proyecto: 85, semestral: 79 }
  },

  /* grupoId null = aviso general para toda la universidad */
  avisos: [
    { id: 'a1', autorId: 'sistema', grupoId: null, importante: true, fecha: '2026-09-21T08:00:00',
      titulo: 'Periodo de inscripción abierto',
      cuerpo: 'La inscripción de materias del II Semestre 2026 está abierta hasta el 9 de octubre de 2026. Revisa tu horario antes de confirmar para evitar choques.' },
    { id: 'a2', autorId: 'sistema', grupoId: null, importante: false, fecha: '2026-09-25T15:30:00',
      titulo: 'Mantenimiento programado de la plataforma',
      cuerpo: 'El sábado 3 de octubre, de 10:00 p. m. a 12:00 a. m., la plataforma podría no estar disponible por mantenimiento.' },
    { id: 'a3', autorId: 'p1', grupoId: 'g1', importante: false, fecha: '2026-09-24T10:15:00',
      titulo: 'Entrega del informe de requisitos',
      cuerpo: 'Recuerden subir el informe de requisitos (SRS) antes del viernes 2 de octubre a las 11:59 p. m. Formato PDF, máximo 2 MB.' },
    { id: 'a4', autorId: 'p2', grupoId: 'g2', importante: true, fecha: '2026-09-26T09:00:00',
      titulo: 'Cambio de aula este jueves',
      cuerpo: 'La clase del jueves 1 de octubre será en el laboratorio 3-110 para la práctica de procedimientos almacenados.' },
    { id: 'a5', autorId: 'p1', grupoId: 'g3', importante: false, fecha: '2026-09-22T11:40:00',
      titulo: 'Formación de equipos del proyecto web',
      cuerpo: 'Los equipos del proyecto final deben ser de 3 a 5 integrantes. Envíen la lista por mensaje antes del próximo martes.' }
  ],

  mensajes: [
    { id: 'm1', de: 'p1', para: 'e1', fecha: '2026-09-23T16:20:00', leido: false, borradoPor: [],
      asunto: 'Retroalimentación del primer parcial',
      cuerpo: 'Hola, Ana Sofía:\n\nBuen trabajo en el primer parcial. En la pregunta de diagramas de secuencia faltó incluir los mensajes de retorno; repásalo para el segundo parcial.\n\nSaludos,\nProf. María González' },
    { id: 'm2', de: 'e1', para: 'p2', fecha: '2026-09-20T09:05:00', leido: true, borradoPor: [],
      asunto: 'Consulta sobre el laboratorio 2',
      cuerpo: 'Buenos días, profesor:\n\n¿El laboratorio 2 se entrega de forma individual o en parejas?\n\nGracias,\nAna Sofía Rodríguez' },
    { id: 'm3', de: 'p2', para: 'e1', fecha: '2026-09-21T07:45:00', leido: true, borradoPor: [],
      asunto: 'Re: Consulta sobre el laboratorio 2',
      cuerpo: 'Hola, Ana Sofía. Es en parejas; ambos integrantes deben subir el mismo archivo.\n\nProf. Roberto Díaz' },
    { id: 'm4', de: 'e2', para: 'p1', fecha: '2026-09-25T18:30:00', leido: false, borradoPor: [],
      asunto: 'Justificación de ausencia',
      cuerpo: 'Profesora, no pude asistir a la clase del miércoles por una cita médica. Adjuntaré la constancia en la próxima clase.\n\nCarlos Mendoza' },
    { id: 'm5', de: 'p3', para: 'p1', fecha: '2026-09-26T12:10:00', leido: false, borradoPor: [],
      asunto: 'Reunión de coordinación',
      cuerpo: 'María, ¿podemos reunirnos el martes a las 3:00 p. m. para coordinar las fechas de los segundos parciales?\n\nElena' }
  ]
};
