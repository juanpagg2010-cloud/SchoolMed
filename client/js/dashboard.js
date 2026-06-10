// Datos de sesion guardados despues del login.
const sessionUser = JSON.parse(localStorage.getItem("schoolmed_user") || "null");
const sessionToken = localStorage.getItem("schoolmed_token");

// Metadatos visuales y textos principales para cada rol.
const roleMeta = {
  Coordinador: {
    name: "Coordinador",
    label: "Coordinador",
    kicker: "Centro de decisiones",
    title: "Elige una accion y dirige la gestion medica en vivo.",
    copy: "Un recorrido por misiones para revisar excusas, coordinar usuarios, comunicar familias y presentar indicadores sin perder el hilo.",
  },
  Acudiente: {
    name: "Padre",
    label: "Padre de familia",
    kicker: "Ruta familiar",
    title: "Radica, sigue y entiende cada excusa desde una experiencia guiada.",
    copy: "La familia elige que necesita hacer y entra a una pantalla clara para enviar soportes o revisar el avance del caso.",
  },
  Profesor: {
    name: "Profesor",
    label: "Profesor",
    kicker: "Aula operativa",
    title: "Selecciona un curso y mira solo lo que importa para la clase.",
    copy: "El profesor navega por cursos, permisos vigentes y novedades aprobadas sin revisar tablas administrativas.",
  },
};

// Usuario actual usado para personalizar el panel.
const currentUser = sessionUser || {
  name: "",
  email: "",
  role: "Coordinador",
};

// Algunos dashboards fijan el rol desde el HTML; si no, se usa el rol de sesion.
const fixedRole = document.body.dataset.dashboardRole || "";
let activeRole = fixedRole || currentUser.role || "Coordinador";
let selectedGradeId = "";
let emailDraft = null;
const activeSectionByRole = {
  Coordinador: "coord-radar",
  Acudiente: "guardian-create",
  Profesor: "teacher-map",
};
const appState = loadState();
const apiBaseUrl = "/api/v1";
let hasSyncedRemoteData = false;
let isSyncingRemoteData = false;
let validationResult = null;
let validationScanner = null;
let validationScannerRunning = false;
let qrCodeLibraryPromise = null;
let qrScannerLibraryPromise = null;

// Referencias a regiones dinamicas del dashboard.
const root = document.querySelector("#dashboard-root");
const roleTabs = document.querySelector("#role-tabs");
const userName = document.querySelector("#user-name");
const userEmail = document.querySelector("#user-email");
const roleLabel = document.querySelector("#role-label");
const heroKicker = document.querySelector("#hero-kicker");
const heroTitle = document.querySelector("#hero-title");
const heroCopy = document.querySelector("#hero-copy");
const heroStats = document.querySelector("#hero-stats");

// Traducciones de estados del backend a etiquetas legibles.
const statusLabels = {
  Aprobada: "Aceptada",
  Rechazada: "Rechazada",
  PendienteRevision: "Por revisar",
};

// Estilos de cada estado de excusa.
const statusClasses = {
  Aprobada: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  Rechazada: "border-red-400/30 bg-red-400/10 text-red-200",
  PendienteRevision: "border-amber-300/30 bg-amber-300/10 text-amber-100",
};

// Puntos de color dentro de cada badge de estado.
const statusDots = {
  Aprobada: "bg-emerald-300 shadow-emerald-300/40",
  Rechazada: "bg-red-300 shadow-red-300/40",
  PendienteRevision: "bg-amber-200 shadow-amber-200/40",
};

// Gradientes de acento por rol.
const roleAccent = {
  Coordinador: "from-cyan-300 via-emerald-200 to-white",
  Acudiente: "from-emerald-200 via-cyan-200 to-white",
  Profesor: "from-sky-200 via-cyan-200 to-emerald-100",
};

// Estado en memoria; los datos persistentes vienen de MongoDB por API.
function loadState() {
  return {
    grades: [],
    users: [],
    excuses: [],
    feed: [],
  };
}

// Conserva compatibilidad con flujos existentes; ya no persiste datos de negocio localmente.
function saveState() {
}

// Escapa texto antes de insertarlo en HTML para evitar inyecciones.
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

// Genera un campo de formulario con estilos consistentes.
function field(label, id, type = "text", placeholder = "") {
  return `
    <label class="grid gap-2 text-sm font-bold text-slate-300">${label}
      <input id="${id}" type="${type}" class="field" placeholder="${placeholder}" />
    </label>
  `;
}

// Helper para consumir la API autenticada desde el dashboard.
async function apiRequest(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`,
      ...(options.headers || {}),
    },
  }).catch((error) => {
    if (error.name === "AbortError") {
      throw new Error("La solicitud tardo demasiado. Revisa tu conexion o intenta con un archivo mas liviano.");
    }

    throw error;
  }).finally(() => window.clearTimeout(timeout));

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    throw new Error(data.message || "No se pudo completar la solicitud.");
  }

  return data;
}

// Helper para subir formularios multipart sin forzar Content-Type manual.
async function apiFormRequest(path, formData, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 45000);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    body: formData,
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      ...(options.headers || {}),
    },
  }).catch((error) => {
    if (error.name === "AbortError") {
      throw new Error("La subida tardo demasiado. Intenta con un PDF o imagen menor a 5 MB.");
    }

    throw error;
  }).finally(() => window.clearTimeout(timeout));

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    throw new Error(data.message || "No se pudo completar la solicitud.");
  }

  return data;
}

// Adapta usuarios de MongoDB al formato del dashboard.
function mapUserFromApi(user) {
  return {
    id: user._id || user.id,
    active: user.isActive,
    email: user.email || "",
    name: user.name || "",
    phone: user.phone || "",
    role: user.role || "Acudiente",
  };
}

// Adapta grados de MongoDB al formato del dashboard.
function mapGradeFromApi(grade) {
  return {
    id: grade._id || grade.id,
    group: grade.group || "",
    name: grade.name || "",
    students: grade.students || 0,
    teacher: grade.teacher || "",
  };
}

// Adapta movimientos de MongoDB a texto visible.
function mapActivityFromApi(activity) {
  return activity.message || "Movimiento registrado.";
}

// Adapta una excusa de MongoDB al formato que usa el dashboard visual.
function mapExcuseFromApi(excuse) {
  const guardian = excuse.acudienteId || {};
  const file = excuse.archivo || {};

  return {
    id: excuse._id || excuse.id,
    student: excuse.nombreEstudiante || "",
    document: excuse.documentoEstudiante || "",
    guardian: guardian.name || currentUser.name || "Acudiente",
    email: guardian.email || currentUser.email || "",
    phone: guardian.phone || currentUser.phone || "",
    grade: excuse.grado || "",
    group: excuse.grupo || "",
    reason: excuse.motivo || "Excusa medica",
    description: excuse.descripcion || "Soporte medico adjunto.",
    start: String(excuse.fechaInicio || "").slice(0, 10),
    end: String(excuse.fechaFin || "").slice(0, 10),
    status: excuse.estado || "PendienteRevision",
    file: file.nombreOriginal || file.nombreArchivo || "Sin archivo",
    validationCode: excuse.codigoValidacion || "",
    qrPayload: excuse.qrPayload || excuse.codigoValidacion || "",
  };
}

function loadExternalScript(src, globalName) {
  if (globalName && window[globalName]) {
    return Promise.resolve(window[globalName]);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);

    if (existing) {
      existing.addEventListener("load", () => resolve(globalName ? window[globalName] : true), { once: true });
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar el recurso externo.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve(globalName ? window[globalName] : true);
    script.onerror = () => reject(new Error("No se pudo cargar el recurso externo."));
    document.head.appendChild(script);
  });
}

function loadQrCodeLibrary() {
  qrCodeLibraryPromise ||= loadExternalScript(
    "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
    "QRCode",
  );
  return qrCodeLibraryPromise;
}

function loadQrScannerLibrary() {
  qrScannerLibraryPromise ||= loadExternalScript(
    "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js",
    "Html5Qrcode",
  );
  return qrScannerLibraryPromise;
}

// Carga todos los datos persistentes que necesita el rol actual.
async function syncRemoteData({ force = false } = {}) {
  if (!sessionToken || isSyncingRemoteData || (hasSyncedRemoteData && !force)) return;

  const pathsByRole = {
    Acudiente: "/medical-excuses/me",
    Coordinador: "/medical-excuses/review",
    Profesor: "/medical-excuses/classroom",
  };
  const path = pathsByRole[activeRole];
  if (!path) return;

  isSyncingRemoteData = true;

  try {
    const requests = [
      apiRequest(path),
      activeRole !== "Acudiente" ? apiRequest("/grades") : Promise.resolve({ grades: [] }),
      activeRole !== "Acudiente" ? apiRequest("/activities") : Promise.resolve({ activities: [] }),
      activeRole === "Coordinador" ? apiRequest("/users") : Promise.resolve({ users: [] }),
    ];
    const [excuseData, gradeData, activityData, userData] = await Promise.all(requests);

    appState.excuses = (excuseData.excusas || []).map(mapExcuseFromApi);
    appState.grades = (gradeData.grades || []).map(mapGradeFromApi);
    appState.feed = (activityData.activities || []).map(mapActivityFromApi);
    appState.users = (userData.users || []).map(mapUserFromApi);
    hasSyncedRemoteData = true;
    render();
  } catch (error) {
    console.warn(`No se pudieron sincronizar datos: ${error.message}`);
  } finally {
    isSyncingRemoteData = false;
  }
}

// Renderiza la etiqueta visual de estado de una excusa.
function statusBadge(status) {
  return `
    <span class="status-pill ${statusClasses[status] || "border-white/10 bg-white/10 text-slate-200"}">
      <span class="h-1.5 w-1.5 rounded-full shadow-lg ${statusDots[status] || "bg-slate-300"}"></span>
      ${statusLabels[status] || status}
    </span>
  `;
}

// Determina si una excusa aprobada sigue vigente para el docente.
function isActiveExcuse(excuse) {
  const end = new Date(`${excuse.end}T23:59:59`);
  return excuse.status === "Aprobada" && end >= new Date();
}

// Encabezado reutilizable para secciones internas del dashboard.
function sectionHeader(title, copy = "") {
  return `
    <div class="mb-5 flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
      <h2 class="text-xl font-black tracking-tight text-white">${title}</h2>
      ${copy ? `<p class="mt-1 text-sm leading-6 text-slate-400">${copy}</p>` : ""}
      </div>
      <span class="hidden h-px w-28 bg-gradient-to-r from-cyan-300/70 to-transparent sm:block"></span>
    </div>
  `;
}

// Calcula porcentajes seguros evitando division por cero.
function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

// Formatea el rango de fechas de una excusa.
function dateRange(excuse) {
  return `${escapeHtml(excuse.start)} a ${escapeHtml(excuse.end)}`;
}

// Grafica mini barras para indicadores rapidos.
function renderMiniChart(values) {
  const max = Math.max(...values, 1);
  return `
    <div class="flex h-16 items-end gap-1.5">
      ${values.map((value, index) => `
        <span
          class="flow-line block flex-1 rounded-t bg-cyan-200/20 shadow-lg shadow-cyan-950/10"
          style="height:${Math.max(18, (value / max) * 100)}%; animation-delay:${index * 90}ms"
        ></span>
      `).join("")}
    </div>
  `;
}

// Construye tarjetas de senales/indicadores para el hero segun el rol activo.
function renderHeroSignal() {
  const pending = appState.excuses.filter((item) => item.status === "PendienteRevision").length;
  const approved = appState.excuses.filter((item) => item.status === "Aprobada").length;
  const active = appState.excuses.filter(isActiveExcuse).length;
  const total = appState.excuses.length;
  const values = [appState.users.length, pending, approved, active, appState.grades.length, total];

  return `
    <div class="motion-card hidden rounded-lg border border-white/10 bg-slate-950/35 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl lg:block">
      <div class="mb-4 flex items-center justify-between gap-3">
        <span class="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Pulso SchoolMed</span>
        <span class="live-dot h-2.5 w-2.5 rounded-full bg-emerald-300"></span>
      </div>
      ${renderMiniChart(values)}
      <div class="mt-4 grid grid-cols-3 gap-2 text-center">
        <span class="rounded-lg bg-white/[0.055] p-2 text-xs font-black text-cyan-100">${percent(approved, total)}% ok</span>
        <span class="rounded-lg bg-white/[0.055] p-2 text-xs font-black text-amber-100">${pending} review</span>
        <span class="rounded-lg bg-white/[0.055] p-2 text-xs font-black text-emerald-100">${active} live</span>
      </div>
    </div>
  `;
}

// Estado vacio reutilizable para listas sin informacion.
function emptyState(message) {
  return `<p class="rounded-lg border border-white/10 bg-white/[0.035] px-4 py-8 text-sm font-bold text-slate-400">${message}</p>`;
}

// Crea un boton lateral de navegacion interna del dashboard.
function commandTile(action) {
  const isActive = action.target === activeSectionByRole[activeRole];
  return `
    <button type="button" class="command-tile ${isActive ? "is-active" : ""}" data-jump="${action.target}">
      <span class="flex items-center justify-between gap-3">
        <span class="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">${action.code}</span>
        <span class="h-2 w-2 rounded-full bg-cyan-200 shadow-lg shadow-cyan-200/50"></span>
      </span>
      <span class="text-base font-black text-white">${action.title}</span>
      <span class="text-xs font-semibold leading-5 text-slate-400">${action.copy}</span>
    </button>
  `;
}

// Estructura comun de navegacion lateral/movil mas contenido principal.
function commandShell(actions, content) {
  return `
    <div class="mb-5 mobile-command soft-scrollbar">
      ${actions.map(commandTile).join("")}
    </div>
    <div class="grid gap-7 xl:grid-cols-[310px_1fr] xl:items-start">
      <aside class="command-rail hidden xl:block">
        <p class="px-2 pb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">Elige una accion</p>
        <div class="grid gap-3">${actions.map(commandTile).join("")}</div>
      </aside>
      <div class="min-h-[620px]">${content}</div>
    </div>
  `;
}

// Enlaza botones de navegacion con las secciones visibles del dashboard.
function bindCommandShell() {
  const buttons = document.querySelectorAll("[data-jump]");
  const zones = document.querySelectorAll(".focus-zone");
  const availableTargets = Array.from(zones).map((zone) => zone.id);
  const firstTarget = availableTargets[0] || buttons[0]?.dataset.jump;
  const activeTarget = availableTargets.includes(activeSectionByRole[activeRole])
    ? activeSectionByRole[activeRole]
    : firstTarget;
  activeSectionByRole[activeRole] = activeTarget;

  zones.forEach((zone) => {
    zone.classList.toggle("is-visible", zone.id === activeTarget);
  });

  buttons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.jump === activeTarget);
  });

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.querySelector(`#${button.dataset.jump}`);
      if (!target) return;

      activeSectionByRole[activeRole] = button.dataset.jump;
      buttons.forEach((item) => {
        item.classList.toggle("is-active", item.dataset.jump === button.dataset.jump);
      });
      zones.forEach((zone) => {
        zone.classList.remove("is-visible", "is-focused");
      });
      target.classList.add("is-visible");
      target.classList.add("is-focused");
      window.setTimeout(() => target.classList.remove("is-focused"), 1800);
    });
  });
}

// Renderiza tabs de rol cuando el dashboard permite cambiar entre vistas.
function renderTabs() {
  if (!roleTabs) return;

  if (fixedRole) {
    roleTabs.remove();
    return;
  }

  roleTabs.innerHTML = Object.entries(roleMeta).map(([role, meta]) => `
    <button
      type="button"
      data-role-tab="${role}"
      class="rounded-lg px-3 py-2 text-sm font-black transition ${role === activeRole ? "bg-teal-300 text-slate-950 shadow-lg shadow-teal-950/30" : "text-slate-300 hover:bg-white/10 hover:text-white"}"
    >
      ${meta.name}
    </button>
  `).join("");
}

// Actualiza textos, identidad visual y datos del usuario en el encabezado.
function setShell() {
  const meta = roleMeta[activeRole];
  const useSessionIdentity = sessionUser?.role === activeRole;

  userName.textContent = useSessionIdentity ? currentUser.name : "Sin sesion activa";
  userEmail.textContent = useSessionIdentity ? currentUser.email : "Ingresa con tu cuenta";
  roleLabel.textContent = meta.label;
  heroKicker.textContent = meta.kicker;
  heroTitle.textContent = meta.title;
  heroCopy.textContent = meta.copy;
}

// Renderiza metricas resumidas dentro del hero del rol.
function renderStats(items) {
  heroStats.innerHTML = items.map((item) => `
    <div class="metric-card">
      <p class="number-glow text-3xl font-black text-white">${item.value}</p>
      <p class="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">${item.label}</p>
    </div>
  `).join("") + renderHeroSignal();
}

// Vista del coordinador: revision, usuarios, grados y comunicacion.
function renderCoordinator() {
  renderStats([
    { value: appState.users.length, label: "Usuarios" },
    { value: appState.excuses.filter((item) => item.status === "PendienteRevision").length, label: "Por revisar" },
    { value: appState.grades.length, label: "Grados" },
  ]);

  root.innerHTML = commandShell([
    { code: "01", target: "coord-radar", title: "Radar institucional", copy: "Indicadores para presentar." },
    { code: "02", target: "coord-review", title: "Revisar excusas", copy: "Filtrar, aceptar, rechazar y contactar." },
    { code: "03", target: "coord-validate", title: "Validar QR", copy: "Escanear o buscar codigo aprobado." },
    { code: "04", target: "coord-manage", title: "Gestionar usuarios", copy: "Crear cuentas y organizar grados." },
    { code: "05", target: "coord-message", title: "Comunicar familias", copy: "Preparar correo y ver movimientos." },
  ], `
    <section id="coord-radar" class="stage-panel focus-zone animate-rise">
      ${sectionHeader("Radar institucional", "Una lectura rapida del estado actual del colegio.")}
      <div class="grid gap-4 lg:grid-cols-4">
        ${[
          ["Revision prioritaria", `${appState.excuses.filter((item) => item.status === "PendienteRevision").length} excusas`, "bg-amber-300/15 text-amber-100"],
          ["Familias activas", `${appState.users.filter((user) => user.role === "Acudiente" && user.active).length} acudientes`, "bg-emerald-300/15 text-emerald-100"],
          ["Cursos cubiertos", `${appState.grades.length} grados`, "bg-cyan-300/15 text-cyan-100"],
          ["Trazabilidad", `${appState.feed.length} eventos`, "bg-fuchsia-300/15 text-fuchsia-100"],
        ].map(([title, value, tone], index) => `
          <article class="action-card stagger-item" style="--i:${index}">
            <div class="mb-5 flex items-center justify-between">
              <span class="h-10 w-10 rounded-lg ${tone}"></span>
              <span class="text-xs font-black uppercase tracking-[0.16em] text-slate-500">0${index + 1}</span>
            </div>
            <p class="text-sm font-bold text-slate-400">${title}</p>
            <p class="mt-1 text-2xl font-black text-white">${value}</p>
          </article>
        `).join("")}
      </div>
    </section>

    <section id="coord-review" class="stage-panel focus-zone animate-rise-delay">
      ${sectionHeader("Excusas medicas recibidas", "Busca por estudiante o acudiente y decide cada caso desde una vista de control.")}
      <div class="mb-4 grid gap-3 lg:grid-cols-[1fr_190px_170px]">
        <input id="excuse-search" class="field" placeholder="Buscar por nombre, acudiente o grado" />
        <select id="excuse-status-filter" class="field">
          <option value="all">Todas</option>
          <option value="PendienteRevision">Por revisar</option>
          <option value="Aprobada">Aceptada</option>
          <option value="Rechazada">Rechazada</option>
        </select>
        <button id="clear-filters" type="button" class="secondary-action">Limpiar filtro</button>
      </div>
      <div id="excuse-table" class="soft-scrollbar overflow-hidden rounded-lg border border-white/10"></div>
    </section>

    <section id="coord-validate" class="stage-panel focus-zone">
      ${sectionHeader("Validar excusa aceptada", "Lee el QR del acudiente o busca el codigo unico entregado al aprobar la excusa.")}
      <div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div class="grid gap-4">
          <form id="validation-form" class="section-panel grid gap-4">
            <label class="grid gap-2 text-sm font-bold text-slate-300">Codigo de validacion
              <input id="validation-code" class="field uppercase" placeholder="SM-2026-AB12CD" autocomplete="off" />
            </label>
            <div class="flex flex-wrap gap-3">
              <button class="primary-action" type="submit">Buscar codigo</button>
              <button id="start-qr-scan" class="secondary-action" type="button">Leer QR</button>
              <button id="stop-qr-scan" class="mini-action text-slate-200" type="button">Detener</button>
            </div>
          </form>
          <div class="section-panel">
            <p class="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Camara</p>
            <div id="qr-reader" class="mt-4 min-h-56 overflow-hidden rounded-lg border border-white/10 bg-slate-950/45"></div>
            <p id="qr-reader-status" class="mt-3 text-sm font-semibold text-slate-400">Lista para escanear cuando el coordinador active la camara.</p>
          </div>
        </div>
        <div id="validation-result" class="section-panel"></div>
      </div>
    </section>

    <section id="coord-manage" class="stage-panel focus-zone">
      <div class="grid gap-7 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
        ${sectionHeader("Administracion", "Crea usuarios y grados sin salir del panel.")}
        <form id="user-form" class="grid gap-4">
          ${field("Nombre completo", "user-name-input", "text", "Ej: Ana Torres")}
          ${field("Correo", "user-email-input", "email", "correo@dominio.com")}
          ${field("Telefono", "user-phone-input", "tel", "Telefono de contacto")}
          ${field("Contrasena inicial", "user-password-input", "password", "Minimo 6 caracteres")}
          <label class="grid gap-2 text-sm font-bold text-slate-300">Rol
            <select id="user-role-input" class="field">
              <option>Profesor</option>
              <option>Acudiente</option>
              <option>Coordinador</option>
            </select>
          </label>
          <button class="primary-action" type="submit">Crear usuario</button>
        </form>
        </div>

        <div>
          <div class="mb-3 flex items-center justify-between gap-3">
            <h3 class="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Grados</h3>
            <button id="add-grade" type="button" class="mini-action text-cyan-100">Agregar</button>
          </div>
          <div id="grades-list" class="grid gap-3"></div>
        </div>
      </div>
    </section>

    <section id="coord-message" class="stage-panel focus-zone">
      <div class="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div class="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            ${sectionHeader("Correo a padre de familia")}
            <form id="email-form" class="grid gap-4">
              <label class="grid gap-2 text-sm font-bold text-slate-300">Destinatario
                <select id="email-to" class="field">
                  ${emailDraft ? `<option value="${escapeHtml(emailDraft.to)}">${escapeHtml(emailDraft.to)}</option>` : ""}
                  ${appState.users.filter((user) => user.role === "Acudiente").map((user) => `<option value="${escapeHtml(user.email)}">${escapeHtml(user.name)} - ${escapeHtml(user.email)}</option>`).join("") || `<option value="">Crea primero un acudiente</option>`}
                </select>
              </label>
              <label class="grid gap-2 text-sm font-bold text-slate-300">Asunto
                <input id="email-subject" type="text" class="field" value="${escapeHtml(emailDraft?.subject || "")}" placeholder="Revision de excusa medica" />
              </label>
              <label class="grid gap-2 text-sm font-bold text-slate-300">Mensaje
                <textarea id="email-message" rows="4" class="field resize-none" placeholder="Escribe el mensaje para la familia">${escapeHtml(emailDraft?.body || "")}</textarea>
              </label>
              <button class="primary-action" type="submit">Preparar correo</button>
            </form>
          </div>

          <div class="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            ${sectionHeader("Ultimos movimientos")}
            <div class="grid gap-3">
              ${appState.feed.slice(0, 5).map((item, index) => `<p class="stagger-item rounded-lg border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-semibold text-slate-300" style="--i:${index}">${escapeHtml(item)}</p>`).join("") || emptyState("Aun no hay movimientos registrados.")}
            </div>
          </div>
      </div>
    </section>
  `);

  renderGradesList();
  renderCoordinatorExcuses();
  renderValidationResult();
  bindCoordinator();
  bindCommandShell();
}

// Lista local de grados administrados desde el panel.
function renderGradesList() {
  const list = document.querySelector("#grades-list");
  if (!list) return;

  list.innerHTML = appState.grades.map((grade) => `
    <div class="action-card grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <p class="font-black text-white">${escapeHtml(grade.name)} ${escapeHtml(grade.group)}</p>
        <p class="text-sm font-semibold text-slate-400">${grade.students} estudiantes${grade.teacher ? ` - ${escapeHtml(grade.teacher)}` : ""}</p>
      </div>
      <div class="flex gap-2">
        <button data-edit-grade="${grade.id}" type="button" class="mini-action text-sky-100">Editar</button>
        <button data-delete-grade="${grade.id}" type="button" class="mini-action text-red-100">Quitar</button>
      </div>
    </div>
  `).join("") || emptyState("Aun no hay grados creados.");
}

// Tabla filtrable de excusas para revision del coordinador.
function renderCoordinatorExcuses() {
  const table = document.querySelector("#excuse-table");
  const search = document.querySelector("#excuse-search")?.value.toLowerCase() || "";
  const status = document.querySelector("#excuse-status-filter")?.value || "all";
  const rows = appState.excuses.filter((excuse) => {
    const text = `${excuse.student} ${excuse.guardian} ${excuse.grade} ${excuse.group}`.toLowerCase();
    return text.includes(search) && (status === "all" || excuse.status === status);
  });

  table.innerHTML = `
    <div class="hidden grid-cols-[1.1fr_1fr_0.55fr_0.7fr_1fr] gap-4 bg-white/[0.065] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500 lg:grid">
      <span>Estudiante</span><span>Padre</span><span>Grado</span><span>Estado</span><span>Accion</span>
    </div>
    <div class="grid gap-2 p-2">
      ${rows.map((excuse) => `
        <article class="stagger-item grid gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-4 py-4 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-200/30 hover:bg-white/[0.07] lg:grid-cols-[1.1fr_1fr_0.55fr_0.7fr_1fr] lg:items-center" style="--i:${rows.indexOf(excuse)}">
          <div>
            <p class="font-black text-white">${escapeHtml(excuse.student)}</p>
            <p class="text-sm font-semibold text-slate-400">${escapeHtml(excuse.reason)} - ${dateRange(excuse)}</p>
          </div>
          <div>
            <p class="text-sm font-bold text-slate-200">${escapeHtml(excuse.guardian)}</p>
            <p class="text-xs font-semibold text-slate-500">${escapeHtml(excuse.email)}</p>
          </div>
          <p class="text-sm font-black text-slate-300">${escapeHtml(excuse.grade)} ${escapeHtml(excuse.group)}</p>
          <div>${statusBadge(excuse.status)}</div>
          <div class="flex flex-wrap gap-2">
            <button data-approve="${excuse.id}" type="button" class="mini-action text-emerald-100">Aceptar</button>
            <button data-reject="${excuse.id}" type="button" class="mini-action text-red-100">Rechazar</button>
            <button data-email-fill="${escapeHtml(excuse.email)}" data-email-student="${escapeHtml(excuse.student)}" type="button" class="mini-action text-sky-100">Correo</button>
          </div>
        </article>
      `).join("") || `<p class="px-4 py-8 text-sm font-bold text-slate-400">No hay excusas con esos filtros.</p>`}
    </div>
  `;
}

function renderValidationResult() {
  const container = document.querySelector("#validation-result");
  if (!container) return;

  if (!validationResult) {
    container.innerHTML = emptyState("Escanea un QR o escribe un codigo para validar si la excusa fue aceptada.");
    return;
  }

  if (!validationResult.accepted) {
    container.innerHTML = `
      <div class="rounded-lg border border-red-400/25 bg-red-400/10 p-5">
        <p class="text-xs font-black uppercase tracking-[0.18em] text-red-100">No aparece aceptada</p>
        <h3 class="mt-2 text-2xl font-black text-white">La excusa no fue encontrada como aceptada.</h3>
        <p class="mt-3 text-sm font-semibold leading-6 text-red-100">${escapeHtml(validationResult.message || "Si no aparece, no esta aceptada en SchoolMed.")}</p>
      </div>
    `;
    return;
  }

  const excuse = validationResult.excusa;
  container.innerHTML = `
    <div class="grid gap-4">
      <div class="rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-5">
        <p class="text-xs font-black uppercase tracking-[0.18em] text-emerald-100">Excusa aceptada</p>
        <h3 class="mt-2 text-2xl font-black text-white">${escapeHtml(excuse.nombreEstudiante || "Estudiante")}</h3>
        <p class="mt-2 text-sm font-semibold text-emerald-100">Codigo ${escapeHtml(excuse.codigoValidacion || "")} - ${escapeHtml(validationResult.vigencia || excuse.vigencia || "")}</p>
      </div>
      <div class="grid gap-3 text-sm font-semibold text-slate-300 sm:grid-cols-2">
        <p class="rounded-lg bg-white/[0.055] p-3"><span class="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Acudiente</span>${escapeHtml(excuse.acudienteId?.name || "No registrado")}</p>
        <p class="rounded-lg bg-white/[0.055] p-3"><span class="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Grado</span>${escapeHtml(excuse.grado || "")} ${escapeHtml(excuse.grupo || "")}</p>
        <p class="rounded-lg bg-white/[0.055] p-3"><span class="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Desde</span>${String(excuse.fechaInicio || "").slice(0, 10)}</p>
        <p class="rounded-lg bg-white/[0.055] p-3"><span class="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Hasta</span>${String(excuse.fechaFin || "").slice(0, 10)}</p>
      </div>
      <p class="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-slate-300">${escapeHtml(excuse.descripcion || "Sin descripcion adicional.")}</p>
    </div>
  `;
}

async function validateExcuseCode(code) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) return;

  const input = document.querySelector("#validation-code");
  if (input) input.value = normalizedCode;

  try {
    const data = await apiRequest(`/medical-excuses/validate/${encodeURIComponent(normalizedCode)}`);
    validationResult = {
      accepted: true,
      excusa: data.excusa,
      message: data.message,
      vigencia: data.excusa?.vigencia,
    };
  } catch (error) {
    validationResult = {
      accepted: false,
      message: error.message || "Si no aparece, no esta aceptada en SchoolMed.",
    };
  }

  renderValidationResult();
}

async function stopValidationScanner() {
  if (!validationScanner || !validationScannerRunning) return;

  try {
    await validationScanner.stop();
  } catch (error) {
    console.warn(`No se pudo detener el lector QR: ${error.message}`);
  } finally {
    validationScannerRunning = false;
    document.querySelector("#qr-reader-status").textContent = "Lector QR detenido.";
  }
}

async function startValidationScanner() {
  const status = document.querySelector("#qr-reader-status");
  status.textContent = "Preparando camara...";

  try {
    const Html5Qrcode = await loadQrScannerLibrary();
    validationScanner ||= new Html5Qrcode("qr-reader");

    if (validationScannerRunning) return;

    await validationScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      async (decodedText) => {
        status.textContent = "QR leido. Validando codigo...";
        await stopValidationScanner();
        await validateExcuseCode(decodedText);
      },
    );

    validationScannerRunning = true;
    status.textContent = "Apunta la camara al QR del acudiente.";
  } catch (error) {
    status.textContent = "No se pudo activar el lector QR. Puedes buscar por codigo manualmente.";
    alert(`No se pudo abrir la camara o cargar el lector QR: ${error.message}`);
  }
}

async function renderQrCodes() {
  const targets = document.querySelectorAll("[data-qr-payload]");
  if (!targets.length) return;

  try {
    const QRCode = await loadQrCodeLibrary();

    targets.forEach((target) => {
      const payload = target.dataset.qrPayload;
      if (!payload || target.dataset.rendered === "true") return;

      target.innerHTML = "";
      new QRCode(target, {
        text: payload,
        width: 132,
        height: 132,
        colorDark: "#0f172a",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M,
      });
      target.dataset.rendered = "true";
    });
  } catch (error) {
    targets.forEach((target) => {
      target.innerHTML = `<p class="p-3 text-center text-xs font-bold text-slate-500">QR no disponible. Usa el codigo.</p>`;
    });
  }
}

// Eventos del coordinador: crear usuarios, grados, filtros y decisiones de excusas.
function bindCoordinator() {
  document.querySelector("#user-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.querySelector("#user-name-input").value.trim();
    const email = document.querySelector("#user-email-input").value.trim();
    const phone = document.querySelector("#user-phone-input").value.trim();
    const password = document.querySelector("#user-password-input").value;
    const role = document.querySelector("#user-role-input").value;
    if (!name || !email || !phone || !password) return;

    if (password.length < 6) {
      alert("La contrasena debe tener minimo 6 caracteres.");
      return;
    }

    try {
      await apiRequest("/users", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, password, role }),
      });

      await syncRemoteData({ force: true });
    } catch (error) {
      alert(error.message);
    }
  });

  document.querySelector("#add-grade").addEventListener("click", async () => {
    const name = prompt("Nombre del grado");
    if (!name) return;
    const group = prompt("Grupo") || "";
    const teacher = prompt("Profesor asignado") || "";
    const students = Number(prompt("Cantidad de estudiantes") || 0);

    try {
      await apiRequest("/grades", {
        method: "POST",
        body: JSON.stringify({
          group: group.trim().toUpperCase(),
          name: name.trim(),
          students: Number.isNaN(students) ? 0 : students,
          teacher: teacher.trim(),
        }),
      });
      await syncRemoteData({ force: true });
    } catch (error) {
      alert(error.message);
    }
  });

  document.querySelector("#grades-list").addEventListener("click", async (event) => {
    const editId = event.target.closest("[data-edit-grade]")?.dataset.editGrade;
    const deleteId = event.target.closest("[data-delete-grade]")?.dataset.deleteGrade;

    if (editId) {
      const grade = appState.grades.find((item) => item.id === editId);
      const name = prompt("Nombre del grado", grade.name);
      const group = prompt("Grupo", grade.group);
      if (name && group) {
        try {
          await apiRequest(`/grades/${editId}`, {
            method: "PATCH",
            body: JSON.stringify({
              group: group.toUpperCase(),
              name,
              students: grade.students,
              teacher: grade.teacher,
            }),
          });
          await syncRemoteData({ force: true });
        } catch (error) {
          alert(error.message);
        }
      }
    }

    if (deleteId) {
      try {
        await apiRequest(`/grades/${deleteId}`, { method: "DELETE" });
        await syncRemoteData({ force: true });
      } catch (error) {
        alert(error.message);
      }
    }
  });

  document.querySelector("#excuse-search").addEventListener("input", renderCoordinatorExcuses);
  document.querySelector("#excuse-status-filter").addEventListener("change", renderCoordinatorExcuses);
  document.querySelector("#clear-filters").addEventListener("click", () => {
    document.querySelector("#excuse-search").value = "";
    document.querySelector("#excuse-status-filter").value = "all";
    renderCoordinatorExcuses();
  });

  document.querySelector("#validation-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await validateExcuseCode(document.querySelector("#validation-code").value);
  });

  document.querySelector("#validation-code").addEventListener("input", (event) => {
    event.target.value = event.target.value.toUpperCase();
  });

  document.querySelector("#start-qr-scan").addEventListener("click", startValidationScanner);
  document.querySelector("#stop-qr-scan").addEventListener("click", stopValidationScanner);

  document.querySelector("#excuse-table").addEventListener("click", (event) => {
    const approveId = event.target.closest("[data-approve]")?.dataset.approve;
    const rejectId = event.target.closest("[data-reject]")?.dataset.reject;
    const id = approveId || rejectId;
    if (!id) return;

    const excuse = appState.excuses.find((item) => item.id === id);
    if (!excuse) return;

    const reviewExcuse = async () => {
      try {
        if (approveId) {
          const data = await apiRequest(`/medical-excuses/${id}/approve`, { method: "PATCH" });
          excuse.status = "Aprobada";
          const notification = data.emailNotification || data.excusa?.emailNotification || {};
          const sent = data.emailSent || notification.sent;
          alert(sent
            ? "Excusa aprobada y correo enviado."
            : `Excusa aprobada, pero no se envio el correo: ${notification.reason || "revisa la configuracion de Brevo."}`);
        } else {
          const motivoRechazo = prompt("Escribe el motivo del rechazo");

          if (!motivoRechazo?.trim()) {
            alert("Debes escribir el motivo del rechazo.");
            return;
          }

          const data = await apiRequest(`/medical-excuses/${id}/reject`, {
            method: "PATCH",
            body: JSON.stringify({ motivoRechazo: motivoRechazo.trim() }),
          });
          excuse.status = "Rechazada";
          const notification = data.emailNotification || data.excusa?.emailNotification || {};
          const sent = data.emailSent || notification.sent;
          alert(sent
            ? "Excusa rechazada y correo enviado."
            : `Excusa rechazada, pero no se envio el correo: ${notification.reason || "revisa la configuracion de Brevo."}`);
        }

        await syncRemoteData({ force: true });
      } catch (error) {
        alert(`No se pudo actualizar la excusa: ${error.message}`);
      }
    };

    reviewExcuse();
  });

  document.querySelector("#excuse-table").addEventListener("click", (event) => {
    const button = event.target.closest("[data-email-fill]");
    if (!button) return;

    emailDraft = {
      body: "",
      subject: `SchoolMed - ${button.dataset.emailStudent}`,
      to: button.dataset.emailFill,
    };
    activeSectionByRole.Coordinador = "coord-message";
    render();
  });

  document.querySelector("#email-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const to = document.querySelector("#email-to").value;
    if (!to) return;
    const subject = document.querySelector("#email-subject").value || "SchoolMed";
    const body = document.querySelector("#email-message").value || "";

    try {
      const data = await apiRequest("/emails/send", {
        method: "POST",
        body: JSON.stringify({ body, subject, to }),
      });
      alert(data.emailSent ? "Correo enviado por Brevo." : "No se pudo confirmar el envio del correo.");
      emailDraft = null;
      await syncRemoteData({ force: true });
    } catch (error) {
      alert(error.message);
    }
  });
}

// Vista del acudiente para crear excusas y revisar su seguimiento.
function renderGuardian() {
  const hasGuardianSession = sessionUser?.role === "Acudiente";
  const email = hasGuardianSession ? sessionUser.email : "";
  const name = hasGuardianSession ? sessionUser.name : "";
  const excuses = hasGuardianSession
    ? appState.excuses.filter((item) => item.email === email || item.guardian === name)
    : appState.excuses;

  renderStats([
    { value: excuses.length, label: "Enviadas" },
    { value: excuses.filter(isActiveExcuse).length, label: "Vigentes" },
    { value: excuses.filter((item) => item.status === "PendienteRevision").length, label: "En revision" },
  ]);

  root.innerHTML = commandShell([
    { code: "01", target: "guardian-create", title: "Radicar excusa", copy: "Subir soporte y enviar solicitud." },
    { code: "02", target: "guardian-track", title: "Ver seguimiento", copy: "Estado, vigencia y decision." },
    { code: "03", target: "guardian-status", title: "Estado familiar", copy: "Resumen listo para exponer." },
  ], `
    <section id="guardian-status" class="stage-panel focus-zone">
      <div class="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div class="glass-panel motion-card p-5">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Estado familiar</p>
            <h2 class="mt-2 text-2xl font-black text-white">Tu trazabilidad medica en un solo flujo.</h2>
            <p class="mt-2 text-sm leading-6 text-slate-400">Radica, espera revision y recibe visibilidad para profesores cuando coordinacion aprueba.</p>
          </div>
          <div class="grid min-w-48 gap-2">
            <span class="rounded-lg bg-emerald-300/10 px-4 py-3 text-sm font-black text-emerald-100">${excuses.filter(isActiveExcuse).length} vigentes</span>
            <span class="rounded-lg bg-amber-300/10 px-4 py-3 text-sm font-black text-amber-100">${excuses.filter((item) => item.status === "PendienteRevision").length} en revision</span>
          </div>
        </div>
      </div>
      <div class="section-panel">
        <p class="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Progreso promedio</p>
        <div class="mt-4 space-y-3">
          ${[
            ["Aceptadas", percent(excuses.filter((item) => item.status === "Aprobada").length, excuses.length), "bg-emerald-300"],
            ["En revision", percent(excuses.filter((item) => item.status === "PendienteRevision").length, excuses.length), "bg-amber-200"],
            ["Rechazadas", percent(excuses.filter((item) => item.status === "Rechazada").length, excuses.length), "bg-red-300"],
          ].map(([label, value, bar]) => `
            <div>
              <div class="mb-1 flex justify-between text-xs font-black text-slate-400"><span>${label}</span><span>${value}%</span></div>
              <div class="h-2 overflow-hidden rounded-full bg-white/10"><span class="flow-line block h-full rounded-full ${bar}" style="width:${value}%"></span></div>
            </div>
          `).join("")}
        </div>
      </div>
      </div>
    </section>

    <section id="guardian-create" class="stage-panel focus-zone animate-rise">
        ${sectionHeader("Nueva excusa medica", "Sube el soporte y deja los datos completos del estudiante.")}
        <form id="guardian-form" class="grid gap-4">
          <div class="grid gap-4 sm:grid-cols-2">
            ${field("Nombre del acudiente", "guardian-name", "text", "Nombre completo")}
            ${field("Correo del acudiente", "guardian-email", "email", "correo@dominio.com")}
          </div>
          ${field("Telefono del acudiente", "guardian-phone", "tel", "Telefono de contacto")}
          ${field("Nombre del estudiante", "student", "text", "Nombre completo")}
          ${field("Documento", "document", "text", "Numero de documento")}
          <div class="grid gap-4 sm:grid-cols-2">
            ${field("Grado", "grade", "text", "Nombre del grado")}
            ${field("Grupo", "group", "text", "Grupo")}
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            ${field("Desde", "start", "date")}
            ${field("Hasta", "end", "date")}
          </div>
          ${field("Motivo", "reason", "text", "Consulta, reposo, urgencias...")}
          <label class="grid gap-2 text-sm font-bold text-slate-300">Descripcion
            <textarea id="description" rows="5" class="field resize-none" placeholder="Describe la situacion medica"></textarea>
          </label>
          <label class="grid gap-2 text-sm font-bold text-slate-300">Adjuntar archivo
            <input id="file" type="file" class="field file:mr-4 file:rounded-md file:border-0 file:bg-cyan-300 file:px-4 file:py-2 file:text-sm file:font-black file:text-slate-950" />
          </label>
          <button class="primary-action" type="submit">Enviar excusa</button>
        </form>
    </section>

    <section id="guardian-track" class="stage-panel focus-zone animate-rise-delay">
        ${sectionHeader("Seguimiento de mis excusas", "Consulta si fueron aceptadas, rechazadas, siguen por revisar o continuan vigentes.")}
        <div class="grid gap-4">
          ${excuses.map((excuse, index) => `
            <article class="action-card stagger-item grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start" style="--i:${index}">
              <div>
                <div class="flex flex-wrap items-center gap-3">
                  <h3 class="text-lg font-black text-white">${escapeHtml(excuse.student)}</h3>
                  ${statusBadge(excuse.status)}
                  <span class="rounded-full border border-white/10 px-3 py-1 text-xs font-black ${isActiveExcuse(excuse) ? "text-cyan-200" : "text-slate-400"}">${isActiveExcuse(excuse) ? "Vigente" : "No vigente"}</span>
                </div>
                <p class="mt-2 text-sm font-semibold text-slate-400">${escapeHtml(excuse.grade)} ${escapeHtml(excuse.group)} - ${dateRange(excuse)} - ${escapeHtml(excuse.reason)}</p>
                <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-300">${escapeHtml(excuse.description)}</p>
                <div class="mt-4 grid max-w-xl grid-cols-3 gap-2 text-center text-xs font-black text-slate-400">
                  <span class="rounded-lg bg-white/[0.055] p-2">Radicada</span>
                  <span class="rounded-lg ${excuse.status === "PendienteRevision" ? "bg-amber-300/15 text-amber-100" : "bg-white/[0.055]"} p-2">Revision</span>
                  <span class="rounded-lg ${excuse.status === "Aprobada" ? "bg-emerald-300/15 text-emerald-100" : excuse.status === "Rechazada" ? "bg-red-300/15 text-red-100" : "bg-white/[0.055]"} p-2">Decision</span>
                </div>
              </div>
              <div class="lg:text-right">
                <p class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Soporte</p>
                <p class="mt-1 text-sm font-black text-slate-200">${escapeHtml(excuse.file || "Sin archivo")}</p>
                ${excuse.status === "Aprobada" && excuse.validationCode ? `
                  <div class="mt-4 rounded-lg border border-emerald-300/20 bg-white p-3 text-slate-950 lg:ml-auto">
                    <div class="mx-auto grid h-36 w-36 place-items-center" data-qr-payload="${escapeHtml(excuse.qrPayload || excuse.validationCode)}"></div>
                  </div>
                  <p class="mt-3 rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-center text-xs font-black uppercase tracking-[0.12em] text-emerald-100">${escapeHtml(excuse.validationCode)}</p>
                ` : ""}
              </div>
            </article>
          `).join("") || `<p class="py-8 text-sm font-bold text-slate-400">Aun no has subido excusas medicas.</p>`}
        </div>
    </section>
  `);

  document.querySelector("#guardian-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = event.submitter;
    const get = (id) => document.querySelector(`#${id}`).value.trim();
    const guardianName = hasGuardianSession ? name : get("guardian-name");
    const guardianEmail = hasGuardianSession ? email : get("guardian-email");
    const guardianPhone = hasGuardianSession ? (sessionUser.phone || get("guardian-phone")) : get("guardian-phone");
    if (!guardianName || !guardianEmail || !get("student") || !get("grade") || !get("start") || !get("end")) return;

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Enviando...";
      }

      const formData = new FormData();
      const support = document.querySelector("#file").files[0];

      if (support) {
        const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(support.type)) {
          alert("Solo puedes subir PDF, JPG, PNG o WEBP.");
          return;
        }

        if (support.size > 5 * 1024 * 1024) {
          alert("El archivo no puede pesar mas de 5 MB. Comprimelo o sube un PDF mas liviano.");
          return;
        }
      }

      formData.append("nombreEstudiante", get("student"));
      formData.append("documentoEstudiante", get("document"));
      formData.append("grado", get("grade"));
      formData.append("grupo", get("group").toUpperCase());
      formData.append("motivo", get("reason") || "Excusa medica");
      formData.append("descripcion", get("description") || "Soporte medico adjunto.");
      formData.append("fechaInicio", get("start"));
      formData.append("fechaFin", get("end"));
      if (support) formData.append("archivo", support);

      await apiFormRequest("/medical-excuses", formData, { method: "POST" });
      alert("Excusa medica creada y enviada al coordinador para revision.");
      activeSectionByRole.Acudiente = "guardian-track";
      await syncRemoteData({ force: true });
    } catch (error) {
      alert(`No se pudo enviar la excusa: ${error.message}`);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Enviar excusa";
      }
    }
  });
  renderQrCodes();
  bindCommandShell();
}

// Vista del profesor para consultar excusas aprobadas por grado.
function renderTeacher() {
  const activeExcuses = appState.excuses.filter(isActiveExcuse);
  const selectedGrade = appState.grades.find((grade) => grade.id === selectedGradeId) || appState.grades[0] || null;
  selectedGradeId = selectedGrade?.id || "";
  const gradeExcuses = selectedGrade
    ? activeExcuses.filter((excuse) => excuse.grade === selectedGrade.name && excuse.group === selectedGrade.group)
    : [];

  renderStats([
    { value: appState.grades.length, label: "Grados" },
    { value: activeExcuses.length, label: "Vigentes" },
    { value: appState.feed.length, label: "Novedades" },
  ]);

  root.innerHTML = commandShell([
    { code: "01", target: "teacher-map", title: "Mapa de cursos", copy: "Detectar grados con excusas activas." },
    { code: "02", target: "teacher-grade", title: "Curso seleccionado", copy: "Ver estudiantes con permiso vigente." },
    { code: "03", target: "teacher-feed", title: "Novedades", copy: "Cambios aceptados recientemente." },
  ], `
    <section id="teacher-map" class="stage-panel focus-zone animate-rise">
      <div class="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div class="section-panel">
        <div class="mb-5 flex items-center gap-3 text-sm font-bold text-emerald-200">
          <span class="live-dot h-2.5 w-2.5 rounded-full bg-emerald-300"></span>
          Actualizacion en tiempo real activa
        </div>
        <h2 class="text-2xl font-black text-white">Mapa de grados con excusas vigentes.</h2>
        <p class="mt-2 text-sm leading-6 text-slate-400">Cada curso se ilumina segun la cantidad de estudiantes con permiso medico aprobado.</p>
      </div>
      <div class="glass-panel p-5">
        <p class="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Intensidad por curso</p>
        <div class="mt-4 grid grid-cols-6 gap-2">
          ${appState.grades.map((grade, index) => {
            const count = activeExcuses.filter((excuse) => excuse.grade === grade.name && excuse.group === grade.group).length;
            return `<button data-grade-jump="${grade.id}" class="flow-line stagger-item rounded-lg border border-white/10 ${count ? "bg-cyan-300/20 text-cyan-100" : "bg-white/[0.045] text-slate-400"} px-2 py-4 text-xs font-black transition hover:-translate-y-1 hover:border-cyan-200" style="--i:${index}">${escapeHtml(grade.name.slice(0, 3))}<span class="mt-1 block text-lg text-white">${count}</span></button>`;
          }).join("") || `<div class="col-span-6">${emptyState("Aun no hay grados creados por coordinacion.")}</div>`}
        </div>
      </div>
      </div>
    </section>

    <section id="teacher-grade" class="stage-panel focus-zone animate-rise-delay">
      <div class="grid gap-7 lg:grid-cols-[330px_1fr]">
      <div>
        ${sectionHeader("Grados del colegio", "Selecciona un curso para ver estudiantes con excusa vigente.")}
        <div id="teacher-grades" class="grid gap-3">
          ${appState.grades.map((grade) => {
            const count = activeExcuses.filter((excuse) => excuse.grade === grade.name && excuse.group === grade.group).length;
            const selected = grade.id === selectedGrade?.id;
            return `
              <button data-grade="${grade.id}" type="button" class="action-card grid w-full grid-cols-[1fr_auto] items-center gap-3 text-left ${selected ? "border-cyan-200/50 bg-cyan-300/10 text-cyan-100" : "text-slate-200"}">
                <span>
                  <span class="block text-lg font-black">${escapeHtml(grade.name)} ${escapeHtml(grade.group)}</span>
                  <span class="block text-sm font-semibold text-slate-500">${grade.students} estudiantes</span>
                </span>
                <span class="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-black">${count}</span>
              </button>
            `;
          }).join("") || emptyState("Aun no hay grados disponibles.")}
        </div>
      </div>

      <div>
        ${sectionHeader(selectedGrade ? `Excusas vigentes - ${escapeHtml(selectedGrade.name)} ${escapeHtml(selectedGrade.group)}` : "Excusas vigentes", "Esta vista se actualiza cuando coordinacion acepta una excusa.")}
        <div id="teacher-excuses" class="grid gap-4">
          ${gradeExcuses.map((excuse, index) => `
            <article class="action-card stagger-item grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start" style="--i:${index}">
              <div>
                <div class="flex flex-wrap items-center gap-3">
                  <h3 class="text-lg font-black text-white">${escapeHtml(excuse.student)}</h3>
                  ${statusBadge(excuse.status)}
                </div>
                <p class="mt-2 text-sm font-semibold text-slate-400">${escapeHtml(excuse.reason)} - vigente hasta ${escapeHtml(excuse.end)}</p>
                <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-300">${escapeHtml(excuse.description)}</p>
              </div>
              <p class="rounded-lg border border-cyan-200/20 bg-cyan-300/10 px-3 py-2 text-sm font-black text-cyan-100">${escapeHtml(excuse.file || "Soporte")}</p>
            </article>
          `).join("") || emptyState(selectedGrade ? "Este grado no tiene excusas medicas vigentes." : "Selecciona un grado cuando coordinacion lo haya creado.")}
        </div>
      </div>
      </div>
    </section>

    <section id="teacher-feed" class="stage-panel focus-zone">
          ${sectionHeader("Novedades aceptadas recientemente")}
          <div class="grid gap-3">
            ${appState.feed.slice(0, 6).map((item, index) => `<p class="stagger-item rounded-lg border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-semibold text-slate-300" style="--i:${index}">${escapeHtml(item)}</p>`).join("") || emptyState("Aun no hay novedades registradas.")}
          </div>
    </section>
  `);

  document.querySelector("#teacher-grades").addEventListener("click", (event) => {
    const button = event.target.closest("[data-grade]");
    if (!button) return;
    selectedGradeId = button.dataset.grade;
    render();
  });

  document.querySelectorAll("[data-grade-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedGradeId = button.dataset.gradeJump;
      activeSectionByRole.Profesor = "teacher-grade";
      render();
    });
  });
  bindCommandShell();
}

// Decide que vista renderizar segun el rol activo.
function render() {
  syncRemoteData();
  renderTabs();
  setShell();

  if (activeRole === "Acudiente") {
    renderGuardian();
    return;
  }

  if (activeRole === "Profesor") {
    renderTeacher();
    return;
  }

  renderCoordinator();
}

// Cambio manual de rol en dashboards que muestran varias perspectivas.
roleTabs?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-role-tab]");
  if (!button) return;
  activeRole = button.dataset.roleTab;
  render();
});

document.querySelector("#logout-button").addEventListener("click", logout);
document.querySelector("#logout-button-desktop").addEventListener("click", logout);

// Transicion visual antes de cerrar sesion.
const showSessionTransition = ({ title, message, detail }) => {
  const overlay = document.createElement("div");
  overlay.className = "session-transition session-transition--exit";
  overlay.innerHTML = `
    <div class="session-transition__panel">
      <div class="session-transition__orb">
        <img src="./assets/favicon.jfif" alt="Logo SchoolMed" />
      </div>
      <p class="session-transition__kicker">${detail}</p>
      <h2>${title}</h2>
      <p class="session-transition__copy">${message}</p>
      <div class="session-transition__bar"><span></span></div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("is-visible"));

  return new Promise((resolve) => {
    window.setTimeout(resolve, 1150);
  });
};

// Limpia la sesion local y regresa al login.
async function logout() {
  await showSessionTransition({
    title: "Sesion cerrada",
    message: "Protegimos tu acceso y volvemos al inicio.",
    detail: currentUser?.role || "SchoolMed",
  });
  localStorage.removeItem("schoolmed_token");
  localStorage.removeItem("schoolmed_user");
  window.location.href = "./index.html";
}

// Primer render del dashboard.
render();
