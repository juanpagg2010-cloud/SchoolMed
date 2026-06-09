const stateKey = "schoolmed_dashboard_state_v2";
const sessionUser = JSON.parse(localStorage.getItem("schoolmed_user") || "null");
const sessionToken = localStorage.getItem("schoolmed_token");

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

const currentUser = sessionUser || {
  name: "",
  email: "",
  role: "Coordinador",
};

const fixedRole = document.body.dataset.dashboardRole || "";
let activeRole = fixedRole || currentUser.role || "Coordinador";
let selectedGradeId = "";
const activeSectionByRole = {
  Coordinador: "coord-radar",
  Acudiente: "guardian-create",
  Profesor: "teacher-map",
};
const appState = loadState();

const root = document.querySelector("#dashboard-root");
const roleTabs = document.querySelector("#role-tabs");
const userName = document.querySelector("#user-name");
const userEmail = document.querySelector("#user-email");
const roleLabel = document.querySelector("#role-label");
const heroKicker = document.querySelector("#hero-kicker");
const heroTitle = document.querySelector("#hero-title");
const heroCopy = document.querySelector("#hero-copy");
const heroStats = document.querySelector("#hero-stats");

const statusLabels = {
  Aprobada: "Aceptada",
  Rechazada: "Rechazada",
  PendienteRevision: "Por revisar",
  PendienteVerificacion: "Por verificar",
};

const statusClasses = {
  Aprobada: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  Rechazada: "border-red-400/30 bg-red-400/10 text-red-200",
  PendienteRevision: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  PendienteVerificacion: "border-sky-300/30 bg-sky-300/10 text-sky-100",
};

const statusDots = {
  Aprobada: "bg-emerald-300 shadow-emerald-300/40",
  Rechazada: "bg-red-300 shadow-red-300/40",
  PendienteRevision: "bg-amber-200 shadow-amber-200/40",
  PendienteVerificacion: "bg-sky-200 shadow-sky-200/40",
};

const roleAccent = {
  Coordinador: "from-cyan-300 via-emerald-200 to-white",
  Acudiente: "from-emerald-200 via-cyan-200 to-white",
  Profesor: "from-sky-200 via-cyan-200 to-emerald-100",
};

function loadState() {
  const saved = JSON.parse(localStorage.getItem(stateKey) || "null");
  if (saved) return saved;

  return {
    grades: [],
    users: [],
    excuses: [],
    feed: [],
  };
}

function saveState() {
  localStorage.setItem(stateKey, JSON.stringify(appState));
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function field(label, id, type = "text", placeholder = "") {
  return `
    <label class="grid gap-2 text-sm font-bold text-slate-300">${label}
      <input id="${id}" type="${type}" class="field" placeholder="${placeholder}" />
    </label>
  `;
}

function statusBadge(status) {
  return `
    <span class="status-pill ${statusClasses[status] || "border-white/10 bg-white/10 text-slate-200"}">
      <span class="h-1.5 w-1.5 rounded-full shadow-lg ${statusDots[status] || "bg-slate-300"}"></span>
      ${statusLabels[status] || status}
    </span>
  `;
}

function isActiveExcuse(excuse) {
  const end = new Date(`${excuse.end}T23:59:59`);
  return excuse.status === "Aprobada" && end >= new Date();
}

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

function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function dateRange(excuse) {
  return `${escapeHtml(excuse.start)} a ${escapeHtml(excuse.end)}`;
}

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

function emptyState(message) {
  return `<p class="rounded-lg border border-white/10 bg-white/[0.035] px-4 py-8 text-sm font-bold text-slate-400">${message}</p>`;
}

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

function renderStats(items) {
  heroStats.innerHTML = items.map((item) => `
    <div class="metric-card">
      <p class="number-glow text-3xl font-black text-white">${item.value}</p>
      <p class="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">${item.label}</p>
    </div>
  `).join("") + renderHeroSignal();
}

function renderCoordinator() {
  renderStats([
    { value: appState.users.length, label: "Usuarios" },
    { value: appState.excuses.filter((item) => item.status === "PendienteRevision").length, label: "Por revisar" },
    { value: appState.grades.length, label: "Grados" },
  ]);

  root.innerHTML = commandShell([
    { code: "01", target: "coord-radar", title: "Radar institucional", copy: "Indicadores para presentar." },
    { code: "02", target: "coord-review", title: "Revisar excusas", copy: "Filtrar, aceptar, rechazar y contactar." },
    { code: "03", target: "coord-manage", title: "Gestionar usuarios", copy: "Crear cuentas y organizar grados." },
    { code: "04", target: "coord-message", title: "Comunicar familias", copy: "Preparar correo y ver movimientos." },
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

    <section id="coord-manage" class="stage-panel focus-zone">
      <div class="grid gap-7 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
        ${sectionHeader("Administracion", "Crea usuarios y grados sin salir del panel.")}
        <form id="user-form" class="grid gap-4">
          ${field("Nombre completo", "user-name-input", "text", "Ej: Ana Torres")}
          ${field("Correo", "user-email-input", "email", "correo@dominio.com")}
          ${field("Telefono", "user-phone-input", "tel", "Telefono de contacto")}
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
                  ${appState.users.filter((user) => user.role === "Acudiente").map((user) => `<option value="${escapeHtml(user.email)}">${escapeHtml(user.name)} - ${escapeHtml(user.email)}</option>`).join("") || `<option value="">Crea primero un acudiente</option>`}
                </select>
              </label>
              ${field("Asunto", "email-subject", "text", "Revision de excusa medica")}
              <label class="grid gap-2 text-sm font-bold text-slate-300">Mensaje
                <textarea id="email-message" rows="4" class="field resize-none" placeholder="Escribe el mensaje para la familia"></textarea>
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
  bindCoordinator();
  bindCommandShell();
}

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
            <a class="mini-action text-sky-100" href="mailto:${escapeHtml(excuse.email)}?subject=SchoolMed - ${encodeURIComponent(excuse.student)}">Correo</a>
          </div>
        </article>
      `).join("") || `<p class="px-4 py-8 text-sm font-bold text-slate-400">No hay excusas con esos filtros.</p>`}
    </div>
  `;
}

function bindCoordinator() {
  document.querySelector("#user-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.querySelector("#user-name-input").value.trim();
    const email = document.querySelector("#user-email-input").value.trim();
    const phone = document.querySelector("#user-phone-input").value.trim();
    const role = document.querySelector("#user-role-input").value;
    if (!name || !email || !phone) return;

    appState.users.unshift({ id: crypto.randomUUID(), name, email, phone, role, active: true });
    appState.feed.unshift(`${name} fue creado como ${role}.`);
    saveState();
    render();
  });

  document.querySelector("#add-grade").addEventListener("click", () => {
    const name = prompt("Nombre del grado");
    if (!name) return;
    const group = prompt("Grupo") || "";
    const teacher = prompt("Profesor asignado") || "";
    const students = Number(prompt("Cantidad de estudiantes") || 0);
    appState.grades.unshift({
      id: crypto.randomUUID(),
      name: name.trim(),
      group: group.trim().toUpperCase(),
      teacher: teacher.trim(),
      students: Number.isNaN(students) ? 0 : students,
    });
    appState.feed.unshift(`Se agrego el grado ${name.trim()}${group ? ` ${group.trim().toUpperCase()}` : ""}.`);
    saveState();
    render();
  });

  document.querySelector("#grades-list").addEventListener("click", (event) => {
    const editId = event.target.closest("[data-edit-grade]")?.dataset.editGrade;
    const deleteId = event.target.closest("[data-delete-grade]")?.dataset.deleteGrade;

    if (editId) {
      const grade = appState.grades.find((item) => item.id === editId);
      const name = prompt("Nombre del grado", grade.name);
      const group = prompt("Grupo", grade.group);
      if (name && group) {
        grade.name = name;
        grade.group = group.toUpperCase();
        appState.feed.unshift(`Se actualizo el grado ${grade.name} ${grade.group}.`);
        saveState();
        render();
      }
    }

    if (deleteId) {
      appState.grades = appState.grades.filter((item) => item.id !== deleteId);
      appState.feed.unshift("Coordinacion retiro un grado del sistema.");
      saveState();
      render();
    }
  });

  document.querySelector("#excuse-search").addEventListener("input", renderCoordinatorExcuses);
  document.querySelector("#excuse-status-filter").addEventListener("change", renderCoordinatorExcuses);
  document.querySelector("#clear-filters").addEventListener("click", () => {
    document.querySelector("#excuse-search").value = "";
    document.querySelector("#excuse-status-filter").value = "all";
    renderCoordinatorExcuses();
  });

  document.querySelector("#excuse-table").addEventListener("click", (event) => {
    const approveId = event.target.closest("[data-approve]")?.dataset.approve;
    const rejectId = event.target.closest("[data-reject]")?.dataset.reject;
    const id = approveId || rejectId;
    if (!id) return;

    const excuse = appState.excuses.find((item) => item.id === id);
    excuse.status = approveId ? "Aprobada" : "Rechazada";
    appState.feed.unshift(`${excuse.student} fue ${approveId ? "aceptada" : "rechazada"} por coordinacion.`);
    saveState();
    render();
  });

  document.querySelector("#email-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const to = document.querySelector("#email-to").value;
    if (!to) return;
    const subject = encodeURIComponent(document.querySelector("#email-subject").value || "SchoolMed");
    const body = encodeURIComponent(document.querySelector("#email-message").value || "");
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  });
}

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
              </div>
            </article>
          `).join("") || `<p class="py-8 text-sm font-bold text-slate-400">Aun no has subido excusas medicas.</p>`}
        </div>
    </section>
  `);

  document.querySelector("#guardian-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const get = (id) => document.querySelector(`#${id}`).value.trim();
    const file = document.querySelector("#file").files[0]?.name || "Soporte pendiente";
    const guardianName = hasGuardianSession ? name : get("guardian-name");
    const guardianEmail = hasGuardianSession ? email : get("guardian-email");
    const guardianPhone = hasGuardianSession ? (sessionUser.phone || get("guardian-phone")) : get("guardian-phone");
    if (!guardianName || !guardianEmail || !get("student") || !get("grade") || !get("start") || !get("end")) return;

    appState.excuses.unshift({
      id: crypto.randomUUID(),
      student: get("student"),
      document: get("document"),
      guardian: guardianName,
      email: guardianEmail,
      phone: guardianPhone,
      grade: get("grade"),
      group: get("group").toUpperCase(),
      reason: get("reason") || "Excusa medica",
      description: get("description") || "Soporte medico adjunto.",
      start: get("start"),
      end: get("end"),
      status: "PendienteRevision",
      file,
    });
    appState.feed.unshift(`${guardianName} envio una excusa para ${get("student")}.`);
    saveState();
    render();
  });
  bindCommandShell();
}

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

function render() {
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

roleTabs?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-role-tab]");
  if (!button) return;
  activeRole = button.dataset.roleTab;
  render();
});

document.querySelector("#logout-button").addEventListener("click", logout);
document.querySelector("#logout-button-desktop").addEventListener("click", logout);

const showSessionTransition = ({ title, message, detail }) => {
  const overlay = document.createElement("div");
  overlay.className = "session-transition session-transition--exit";
  overlay.innerHTML = `
    <div class="session-transition__panel">
      <div class="session-transition__orb">
        <span>SM</span>
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

render();
