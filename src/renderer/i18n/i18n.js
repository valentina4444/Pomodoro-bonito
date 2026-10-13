// Tiny i18n layer: English (default) + Spanish (Mexico).
// Static HTML is translated through data-i18n attributes; dynamic UI strings
// go through window.i18n.t(key). The active language lives in the app
// settings (localStorage "pomodoro_settings" → language).
(() => {
  "use strict";

  const STRINGS = {
    en: {
      "app.title": "Pomodoro Cute — Focus Timer",
      "app.brand": "Pomodoro Cute",

      "brand.short": "Pomodoro",
      "brand.line": "Pomodoro<span>Cute little focus club</span>",
      "shell.brandTagline": "Cute little focus club",
      "shell.mainNavAria": "Main navigation",
      "shell.sidebarNote": "Small steps.<br>Lovely progress.",
      "shell.tinyTimer": "Tiny timer",
      "shell.back": "Back to Focus",
      "shell.footer": "A gentle reminder: taking a break is part of the work. ♡",

      "navName.focus": "Focus",
      "navName.tasks": "Tasks",
      "navName.journal": "Journal",
      "navName.stats": "Stats",
      "navName.settings": "Settings",

      "common.close": "Close",

      "timer.expandAria": "Expand window",
      "timer.expandTitle": "Back to normal size",
      "timer.resetAria": "Reset",
      "timer.skipAria": "Skip phase",
      "timer.start": "Start",
      "timer.pause": "Pause",
      "timer.retry": "Retry save",

      "mode.work.word": "WORK",
      "mode.work.label": "Time to focus!",
      "mode.break.word": "BREAK",
      "mode.break.label": "Take a breather ☁️",
      "mode.long.word": "LONG BREAK",
      "mode.long.label": "You earned it! Let it sink in 🌈",

      "unit.session.one": "{n} session",
      "unit.session.other": "{n} sessions",
      "unit.today": "today",
      "unit.minFocus": "{n} min focus",
      "unit.minutes": "{n} min",

      "nav.tasks": "📝 Tasks",
      "nav.journal": "📖 Journal",
      "nav.settings": "⚙ Settings",
      "nav.stats": "📊 Stats",
      "nav.focus": "Focus",
      "region.focus": "Focus dashboard",
      "region.tasks": "Tasks",
      "region.journal": "Journal",
      "region.stats": "Stats",
      "region.settings": "Settings",

      "view.focus.title": "A little focus, a little joy.",
      "view.focus.subtitle": "Make room for one small thing.",
      "view.tasks.title": "Your little plans",
      "view.tasks.subtitle": "Big things grow from small steps.",
      "view.journal.title": "Pages of progress",
      "view.journal.subtitle": "A cozy record of what you've been making.",
      "view.stats.title": "Look how you're growing",
      "view.stats.subtitle": "Every tomato is a little bit of progress.",
      "view.settings.title": "Make yourself at home",
      "view.settings.subtitle": "Your rhythm, your colors, your cozy corner.",

      "welcome.eyebrow": "YOUR COZY CORNER",
      "welcome.headline": "One tomato.<br>One little win.",
      "welcome.body": "You don't have to do it all.<br>Just the next small thing.",
      "welcome.plan": "＋ Plan a little task",
      "today.title": "Today's little wins",
      "today.label": "A fresh little start",
      "today.sessions": "focus sessions",
      "today.minutes": "time well spent",
      "today.completed": "tasks completed",
      "next.title": "Up next",
      "next.seeAll": "See all tasks →",
      "next.focus": "Focus →",
      "next.empty": "A little breathing room. Add a task when you're ready. 🌱",

      "settings.title": "⚙ Settings",
      "settings.work": "Work (min)",
      "settings.break": "Break (min)",
      "settings.longEvery": "Long break every",
      "settings.longBreak": "Long break (min)",
      "settings.sound": "Play sound",
      "settings.notif": "Notifications",
      "settings.theme": "Theme",
      "settings.appearance": "Appearance",
      "settings.language": "Language",

      "theme.tomato": "Tomato",
      "theme.mint": "Mint",
      "theme.blueberry": "Blueberry",
      "theme.peach": "Peach",
      "theme.lavender": "Lavender",
      "appearance.light": "Light",
      "appearance.dark": "Dark",
      "appearance.system": "Follow system",

      "stats.title": "📊 Statistics",
      "stats.daily": "Daily",
      "stats.weekly": "Weekly",
      "stats.monthly": "Monthly",
      "stats.todaySummary": "Today · {sessions} · {minutes}",
      "stats.weekSummary": "This week · {sessions} · {minutes}",
      "stats.monthSummary": "This month · {sessions} · {minutes}",
      "stats.emptyToday": "No sessions yet today — go do one! 🍅",
      "stats.emptyWeek": "No sessions this week yet 🌱",
      "stats.emptyMonth": "No sessions this month yet 🌱",

      "notify.longTitle": "You earned it! 🌈",
      "notify.longBody": "Great work! Time for a long break.",
      "notify.workTitle": "Great job! 🍅",
      "notify.workBody": "Work session complete. Time for a little break!",
      "notify.breakTitle": "Break is over! ✨",
      "notify.breakBody": "Ready to focus again? Let's go!",

      "task.workingOn": "Working on",
      "task.unassigned": "Unassigned focus",
      "task.title": "Title",
      "task.description": "Description",
      "task.optional": "(optional)",
      "task.status": "Status",
      "task.details": "Task details",
      "task.closeAria": "Close task details",
      "task.save": "Save task",
      "task.delete": "Delete task",
      "task.deleteHint": "Session history is kept.",

      "status.todo": "To Do",
      "status.inProgress": "In Progress",
      "status.completed": "Completed",

      "tasks.title": "📝 Tasks",
      "tasks.closeAria": "Close tasks",
      "tasks.newPlaceholder": "One small thing to do…",
      "tasks.newAria": "New task title",
      "tasks.add": "Add",
      "tasks.searchPlaceholder": "Find a little task…",
      "tasks.searchAria": "Search tasks",
      "tasks.dragHint": "Drag a card to move it, or use its status menu.",

      "completion.title": "🍅 A little progress!",
      "completion.closeAria": "Save and continue",
      "completion.summary": "Your focus session is saved. Add a note, or simply continue.",
      "completion.workedOn": "Worked on",
      "completion.what": "What did you accomplish?",
      "completion.notesPlaceholder": "A small step is still a step 🌱",
      "completion.markDone": "Mark this task as completed",
      "completion.save": "Save & continue",

      "journal.title": "📖 Work journal",
      "journal.closeAria": "Close journal",
      "journal.periodAria": "Journal period",
      "journal.day": "Day",
      "journal.week": "Week",
      "journal.month": "Month",
      "journal.prevAria": "Previous period",
      "journal.nextAria": "Next period",
      "journal.today": "Today",
      "journal.dateAria": "Journal date",
      "journal.exportSummary": "Export journal",
      "journal.period": "Period",
      "journal.daySelected": "Selected day",
      "journal.weekSelected": "Selected week",
      "journal.monthSelected": "Selected month",
      "journal.customDates": "Custom dates",
      "journal.allHistory": "All history",
      "journal.from": "From",
      "journal.through": "Through",
      "journal.format": "Format",
      "journal.export": "Export",
      "journal.sessions.one": "{n} sessions",
      "journal.sessions.other": "{n} sessions",

      "tracker.deleted": "{name} (deleted)",
      "tracker.taskFallback": "Task",
      "tracker.lastWorked": "Last worked {date}",
      "tracker.completedInSession": "✓ Task completed in this session",
      "tracker.editNotes": "Edit notes",
      "tracker.emptyColumn": "Room for a little progress 🌱",
      "tracker.noMatch": "No matching tasks here.",
      "tracker.dragTitle": "Drag to another column",
      "tracker.focusOn": "Focus on this",
      "tracker.finishFirstFocus": "Finish or reset your current focus session before choosing another task.",
      "tracker.finishFirst": "Finish or reset your current session before choosing another task.",
      "tracker.created": "Created",
      "tracker.completedOn": "Completed",
      "tracker.sessionsEmpty": "No focus sessions here yet 🌱",
      "tracker.statusFor": "Status for {title}",
      "tracker.exportInvalidRange": "Choose a valid start and end date in order.",
      "tracker.exportCanceled": "Export canceled.",
      "tracker.exportDone": "Journal exported ✓",

      "tracker.damaged": "Saved work data is damaged or uses an unsupported version. Original storage has been preserved.",
      "tracker.full": "Could not save work data. Storage may be full or unavailable. Export your journal to keep a copy and retry.",
      "tracker.readOnly": "Work data is read-only until storage is repaired.",
      "tracker.invalidStatus": "Choose a valid task status.",
      "tracker.invalidDate": "Choose a valid date.",
      "tracker.titleRules": "Enter a title (up to 160 characters) and a description of at most 4,000 characters.",
      "tracker.taskMissing": "This task no longer exists.",
      "tracker.sessionMissing": "This session no longer exists.",
      "tracker.notesLimit": "Keep session notes under 8,000 characters.",
      "tracker.invalidLegacy": "Invalid legacy history",

      "export.header": "Pomodoro work journal",
      "export.date": "Date",
      "export.start": "Start time",
      "export.end": "End time",
      "export.startIso": "Start ISO",
      "export.endIso": "End ISO",
      "export.task": "Task",
      "export.taskId": "Task ID",
      "export.focusMinutes": "Focus minutes",
      "export.notes": "Notes",
      "export.taskCompleted": "Task completed",
      "export.sessionId": "Session ID",
      "export.unassigned": "Unassigned",
      "export.yes": "Yes",
      "export.no": "No",
      "export.doneCheck": "Task completed ✓",

      "app.footer": "Made with 💖 — take care of your eyes, one tomato at a time.",
    },

    "es-MX": {
      "app.title": "Jitomatito Bonito Cute — Temporizador de concentración",
      "app.brand": "Jitomatito Bonito Cute",

      "brand.short": "Jitomatito Bonito",
      "brand.line": "Jitomatito Bonito<span>Clubcito de concentración</span>",
      "shell.brandTagline": "Clubcito de concentración",
      "shell.mainNavAria": "Navegación principal",
      "shell.sidebarNote": "Pasitos chicos.<br>Avances bonitos.",
      "shell.tinyTimer": "Timer chiquito",
      "shell.back": "Volver a la concentración",
      "shell.footer": "Recordatorio suave: descansar también es parte del trabajo. ♡",

      "navName.focus": "Concentración",
      "navName.tasks": "Tareas",
      "navName.journal": "Bitácora",
      "navName.stats": "Estadísticas",
      "navName.settings": "Configuración",

      "common.close": "Cerrar",

      "timer.expandAria": "Ampliar ventana",
      "timer.expandTitle": "Volver al tamaño normal",
      "timer.resetAria": "Reiniciar",
      "timer.skipAria": "Saltar fase",
      "timer.start": "Empezar",
      "timer.pause": "Pausar",
      "timer.retry": "Reintentar guardado",

      "mode.work.word": "TRABAJO",
      "mode.work.label": "¡Hora de concentrarte!",
      "mode.break.word": "DESCANSO",
      "mode.break.label": "Tómate un respiro ☁️",
      "mode.long.word": "DESCANSO LARGO",
      "mode.long.label": "¡Te lo ganaste! Relájate un rato 🌈",

      "unit.session.one": "{n} sesión",
      "unit.session.other": "{n} sesiones",
      "unit.today": "hoy",
      "unit.minFocus": "{n} min de concentración",
      "unit.minutes": "{n} min",

      "nav.tasks": "📝 Tareas",
      "nav.journal": "📖 Bitácora",
      "nav.settings": "⚙ Configuración",
      "nav.stats": "📊 Estadísticas",
      "nav.focus": "Concentración",
      "region.focus": "Panel de concentración",
      "region.tasks": "Tareas",
      "region.journal": "Bitácora",
      "region.stats": "Estadísticas",
      "region.settings": "Configuración",

      "view.focus.title": "Un poquito de concentración, un poquito de alegría.",
      "view.focus.subtitle": "Deja espacio para una cosita.",
      "view.tasks.title": "Tus planecitos",
      "view.tasks.subtitle": "De los pasitos chicos nacen las cosas grandes.",
      "view.journal.title": "Páginas de avance",
      "view.journal.subtitle": "Un registro acogedor de lo que has estado haciendo.",
      "view.stats.title": "Mira cómo vas creciendo",
      "view.stats.subtitle": "Cada jitomatito es un poquito de avance.",
      "view.settings.title": "Siéntete como en casa",
      "view.settings.subtitle": "Tu ritmo, tus colores, tu rinconcito favorito.",

      "welcome.eyebrow": "TU RINCONCITO FAVORITO",
      "welcome.headline": "Un jitomatito.<br>Una victoria chiquita.",
      "welcome.body": "No tienes que hacerlo todo.<br>Solo lo que sigue, poquito a poquito.",
      "welcome.plan": "＋ Planear una tarea",
      "today.title": "Las victorias de hoy",
      "today.label": "Un comienzito fresco",
      "today.sessions": "sesiones de concentración",
      "today.minutes": "tiempo bien invertido",
      "today.completed": "tareas completadas",
      "next.title": "Lo que sigue",
      "next.seeAll": "Ver todas las tareas →",
      "next.focus": "Concentrarme →",
      "next.empty": "Aquí hay espacio para respirar. Agrega una tarea cuando quieras. 🌱",

      "settings.title": "⚙ Configuración",
      "settings.work": "Trabajo (min)",
      "settings.break": "Descanso (min)",
      "settings.longEvery": "Descanso largo cada",
      "settings.longBreak": "Descanso largo (min)",
      "settings.sound": "Reproducir sonido",
      "settings.notif": "Notificaciones",
      "settings.theme": "Tema",
      "settings.appearance": "Apariencia",
      "settings.language": "Idioma",

      "theme.tomato": "Jitomate",
      "theme.mint": "Menta",
      "theme.blueberry": "Mora",
      "theme.peach": "Durazno",
      "theme.lavender": "Lavanda",
      "appearance.light": "Claro",
      "appearance.dark": "Oscuro",
      "appearance.system": "Seguir el sistema",

      "stats.title": "📊 Estadísticas",
      "stats.daily": "Diario",
      "stats.weekly": "Semanal",
      "stats.monthly": "Mensual",
      "stats.todaySummary": "Hoy · {sessions} · {minutes}",
      "stats.weekSummary": "Esta semana · {sessions} · {minutes}",
      "stats.monthSummary": "Este mes · {sessions} · {minutes}",
      "stats.emptyToday": "Aún no hay sesiones hoy — ¡haz una! 🍅",
      "stats.emptyWeek": "Todavía no hay sesiones esta semana 🌱",
      "stats.emptyMonth": "Todavía no hay sesiones este mes 🌱",

      "notify.longTitle": "¡Te lo ganaste! 🌈",
      "notify.longBody": "¡Buen trabajo! Ahora un descanso largo.",
      "notify.workTitle": "¡Bien hecho! 🍅",
      "notify.workBody": "Sesión lista. ¡Hora de un ratito de descanso!",
      "notify.breakTitle": "¡Se acabó el descanso! ✨",
      "notify.breakBody": "¿Listo para concentrarte otra vez? ¡Vámonos!",

      "task.workingOn": "En qué estás trabajando",
      "task.unassigned": "Concentración sin asignar",
      "task.title": "Título",
      "task.description": "Descripción",
      "task.optional": "(opcional)",
      "task.status": "Estado",
      "task.details": "Detalles de la tarea",
      "task.closeAria": "Cerrar detalles de la tarea",
      "task.save": "Guardar tarea",
      "task.delete": "Eliminar tarea",
      "task.deleteHint": "El historial de sesiones se conserva.",

      "status.todo": "Por hacer",
      "status.inProgress": "En progreso",
      "status.completed": "Completada",

      "tasks.title": "📝 Tareas",
      "tasks.closeAria": "Cerrar tareas",
      "tasks.newPlaceholder": "Una cosita por hacer…",
      "tasks.newAria": "Título de la tarea nueva",
      "tasks.add": "Agregar",
      "tasks.searchPlaceholder": "Buscar una tarea…",
      "tasks.searchAria": "Buscar tareas",
      "tasks.dragHint": "Arrastra una tarjeta para moverla, o usa su menú de estado.",

      "completion.title": "🍅 ¡Un poquito de avance!",
      "completion.closeAria": "Guardar y continuar",
      "completion.summary": "Tu sesión de concentración quedó guardada. Agrega una nota o sigue directo.",
      "completion.workedOn": "Trabajaste en",
      "completion.what": "¿Qué lograste?",
      "completion.notesPlaceholder": "Un pasito sigue siendo un pasito 🌱",
      "completion.markDone": "Marcar esta tarea como completada",
      "completion.save": "Guardar y seguir",

      "journal.title": "📖 Bitácora de trabajo",
      "journal.closeAria": "Cerrar bitácora",
      "journal.periodAria": "Periodo de la bitácora",
      "journal.day": "Día",
      "journal.week": "Semana",
      "journal.month": "Mes",
      "journal.prevAria": "Periodo anterior",
      "journal.nextAria": "Periodo siguiente",
      "journal.today": "Hoy",
      "journal.dateAria": "Fecha de la bitácora",
      "journal.exportSummary": "Exportar bitácora",
      "journal.period": "Periodo",
      "journal.daySelected": "Día seleccionado",
      "journal.weekSelected": "Semana seleccionada",
      "journal.monthSelected": "Mes seleccionado",
      "journal.customDates": "Fechas personalizadas",
      "journal.allHistory": "Todo el historial",
      "journal.from": "Desde",
      "journal.through": "Hasta",
      "journal.format": "Formato",
      "journal.export": "Exportar",
      "journal.sessions.one": "{n} sesión",
      "journal.sessions.other": "{n} sesiones",

      "tracker.deleted": "{name} (eliminada)",
      "tracker.taskFallback": "Tarea",
      "tracker.lastWorked": "Última vez el {date}",
      "tracker.completedInSession": "✓ Tarea completada en esta sesión",
      "tracker.editNotes": "Editar notas",
      "tracker.emptyColumn": "Aquí cabe un poquito de avance 🌱",
      "tracker.noMatch": "No hay tareas que coincidan aquí.",
      "tracker.dragTitle": "Arrastrar a otra columna",
      "tracker.focusOn": "Concentrarme en esto",
      "tracker.finishFirstFocus": "Termina o reinicia tu sesión de concentración actual antes de elegir otra tarea.",
      "tracker.finishFirst": "Termina o reinicia tu sesión actual antes de elegir otra tarea.",
      "tracker.created": "Creada",
      "tracker.completedOn": "Completada",
      "tracker.sessionsEmpty": "Aquí aún no hay sesiones 🌱",
      "tracker.statusFor": "Estado de {title}",
      "tracker.exportInvalidRange": "Elige una fecha de inicio y una de fin válidas, en ese orden.",
      "tracker.exportCanceled": "Exportación cancelada.",
      "tracker.exportDone": "Bitácora exportada ✓",

      "tracker.damaged": "Los datos guardados están dañados o usan una versión no soportada. El almacenamiento original se conservó.",
      "tracker.full": "No se pudieron guardar los datos. Puede que el almacenamiento esté lleno o no disponible. Exporta tu bitácora para guardar una copia y vuelve a intentar.",
      "tracker.readOnly": "Los datos solo se pueden leer hasta que se repare el almacenamiento.",
      "tracker.invalidStatus": "Elige un estado de tarea válido.",
      "tracker.invalidDate": "Elige una fecha válida.",
      "tracker.titleRules": "Escribe un título (máximo 160 caracteres) y una descripción de máximo 4,000 caracteres.",
      "tracker.taskMissing": "Esta tarea ya no existe.",
      "tracker.sessionMissing": "Esta sesión ya no existe.",
      "tracker.notesLimit": "Las notas de la sesión deben tener menos de 8,000 caracteres.",
      "tracker.invalidLegacy": "Historial antiguo inválido",

      "export.header": "Bitácora de trabajo · Jitomatito Bonito",
      "export.date": "Fecha",
      "export.start": "Hora de inicio",
      "export.end": "Hora de fin",
      "export.startIso": "Inicio ISO",
      "export.endIso": "Fin ISO",
      "export.task": "Tarea",
      "export.taskId": "ID de tarea",
      "export.focusMinutes": "Minutos de concentración",
      "export.notes": "Notas",
      "export.taskCompleted": "Tarea completada",
      "export.sessionId": "ID de sesión",
      "export.unassigned": "Sin asignar",
      "export.yes": "Sí",
      "export.no": "No",
      "export.doneCheck": "Tarea completada ✓",

      "app.footer": "Hecho con 💖 — cuida tus ojos, un jitomatito a la vez.",
    },
  };

  const SETTINGS_KEY = "pomodoro_settings";

  function storedLanguage() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const settings = raw ? JSON.parse(raw) : null;
      if (settings && typeof settings.language === "string" && STRINGS[settings.language]) return settings.language;
    } catch {
      /* fall through to default */
    }
    return "en";
  }

  let current = storedLanguage();

  function t(key, vars) {
    const table = STRINGS[current] || STRINGS.en;
    let text = table[key];
    if (text === undefined) text = STRINGS.en[key];
    if (text === undefined) return key;
    if (vars) {
      for (const name of Object.keys(vars)) text = text.split(`{${name}}`).join(String(vars[name]));
    }
    return text;
  }

  function count(baseKey, n) {
    return t(`${baseKey}.${n === 1 ? "one" : "other"}`, { n });
  }

  function apply() {
    document.documentElement.lang = current;
    document.title = t("app.title");
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.title = t(el.dataset.i18nTitle);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      el.setAttribute("aria-label", t(el.dataset.i18nAria));
    });
  }

  function setLang(lang) {
    if (!STRINGS[lang] || lang === current) return false;
    current = lang;
    apply();
    if (window.pomodoroLanguage && window.pomodoroLanguage.set) window.pomodoroLanguage.set(lang);
    document.dispatchEvent(new Event("languagechange"));
    return true;
  }

  window.i18n = {
    languages: { en: "English", "es-MX": "Español (México)" },
    t,
    count,
    apply,
    setLang,
    getLang: () => current,
    locale: () => current,
  };

  apply();
})();
