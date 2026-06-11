const API_BASE_URL = "/api/auth";

// Referencias al formulario de autenticacion y sus piezas visuales.
const form = document.querySelector("#auth-form");
const messageBox = document.querySelector("#auth-message");
const submitButton = document.querySelector("#submit-button");
const formTitle = document.querySelector("#form-title");
const formKicker = document.querySelector("#form-kicker");
const formDescription = document.querySelector("#form-description");
const modeHelper = document.querySelector("#mode-helper");
const tabs = document.querySelectorAll(".auth-tab");
const registerFields = document.querySelectorAll(".register-field");
const passwordInput = document.querySelector("#password");

let currentMode = "login";

// Textos y comportamiento que cambian entre iniciar sesion y registrarse.
const modeContent = {
  login: {
    kicker: "Bienvenido",
    title: "Iniciar sesion",
    description: "Ingresa con tu correo y contrasena para continuar.",
    button: "Iniciar sesion",
    helper:
      'No tienes cuenta? <button type="button" class="font-black text-teal-200 hover:text-teal-100" data-switch-mode="register">Registrate aqui</button>',
    passwordAutocomplete: "current-password",
  },
  register: {
    kicker: "Bienvenido",
    title: "Crear cuenta",
    description:
      "Registra tus datos como acudiente para enviar excusas medicas.",
    button: "Crear cuenta",
    helper:
      'Ya tienes cuenta? <button type="button" class="font-black text-teal-200 hover:text-teal-100" data-switch-mode="login">Inicia sesion</button>',
    passwordAutocomplete: "new-password",
  },
};

// Muestra mensajes de error, exito o informacion dentro del formulario.
const showMessage = (text, type = "info") => {
  const styles = {
    error: "border-red-300/30 bg-red-400/10 text-red-100",
    success: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
    info: "border-sky-300/30 bg-sky-400/10 text-sky-100",
  };

  messageBox.className = `rounded-2xl border px-4 py-3 text-sm font-semibold ${styles[type]}`;
  messageBox.textContent = text;
};

// Oculta el mensaje actual del formulario.
const hideMessage = () => {
  messageBox.className =
    "hidden rounded-2xl border px-4 py-3 text-sm font-semibold";
  messageBox.textContent = "";
};

// Bloquea el boton mientras se procesa una peticion para evitar dobles envios.
const setLoading = (isLoading) => {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading
    ? currentMode === "login"
      ? "Ingresando..."
      : "Registrando..."
    : modeContent[currentMode].button;
};

// Cambia visualmente el formulario entre modo login y modo registro.
const setMode = (mode) => {
  currentMode = mode;
  const content = modeContent[mode];

  formKicker.textContent = content.kicker;
  formTitle.textContent = content.title;
  formDescription.textContent = content.description;
  submitButton.textContent = content.button;
  modeHelper.innerHTML = content.helper;
  passwordInput.autocomplete = content.passwordAutocomplete;

  registerFields.forEach((field) => {
    field.classList.toggle("hidden", mode !== "register");
    field.querySelectorAll("input, select").forEach((input) => {
      input.required = mode === "register";
    });
  });

  tabs.forEach((tab) => {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle("border-b-2", isActive);
    tab.classList.toggle("border-teal-300", isActive);
    tab.classList.toggle("text-teal-100", isActive);
    tab.classList.toggle("text-slate-400", !isActive);
  });

  hideMessage();
};

// Lee los campos visibles del formulario y arma el payload para la API.
const getFormData = () => {
  const data = new FormData(form);
  const payload = {
    email: data.get("email")?.trim(),
    password: data.get("password"),
  };

  if (currentMode === "register") {
    payload.name = data.get("name")?.trim();
    payload.phone = data.get("phone")?.trim();
    payload.role = "Acudiente";
  }

  return payload;
};

// Valida campos minimos antes de enviar la peticion al backend.
const validatePayload = (payload) => {
  if (!payload.email || !payload.password) {
    return "El correo y la contrasena son obligatorios.";
  }

  if (payload.password.length < 6) {
    return "La contrasena debe tener minimo 6 caracteres.";
  }

  if (currentMode === "register" && (!payload.name || !payload.phone)) {
    return "Completa nombre y telefono para registrarte como acudiente.";
  }

  return "";
};

// Guarda token y usuario para mantener la sesion en el panel.
const saveSession = ({ token, user }) => {
  localStorage.setItem("schoolmed_token", token);
  localStorage.setItem("schoolmed_user", JSON.stringify(user));
};

// Crea una transicion visual antes de entrar al dashboard.
const showSessionTransition = ({ title, message, detail }) => {
  const overlay = document.createElement("div");
  overlay.className = "session-transition";
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
    window.setTimeout(resolve, 1250);
  });
};

const buildFaceCaptureModal = () => {
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 z-[10000] grid place-items-center bg-slate-950/85 px-4 backdrop-blur-2xl";
  overlay.innerHTML = `
    <div class="w-full max-w-lg rounded-2xl border border-teal-200/20 bg-slate-950 p-5 shadow-2xl shadow-teal-950/30">
      <p class="text-xs font-black uppercase tracking-[0.2em] text-teal-200">Ultimo paso</p>
      <h2 class="mt-2 text-2xl font-black text-white">Registra tus datos biometricos</h2>
      <p class="mt-2 text-sm leading-6 text-slate-400">Mira de frente a la camara. Esta captura se usara para validar que eres tu antes de enviar una excusa medica.</p>
      <div class="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
        <video data-face-video autoplay playsinline muted class="aspect-video w-full object-cover"></video>
      </div>
      <canvas data-face-canvas class="hidden"></canvas>
      <p data-face-status class="mt-3 text-sm font-semibold text-slate-400">Activando camara...</p>
      <div class="mt-5 grid gap-3 sm:grid-cols-2">
        <button data-face-capture type="button" class="rounded-2xl bg-teal-300 px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-teal-200">Registrar rostro</button>
        <button data-face-cancel type="button" class="rounded-2xl border border-white/10 bg-white/[0.055] px-5 py-4 text-sm font-black text-slate-200 transition hover:border-teal-300 hover:bg-white/[0.1]">Cancelar</button>
      </div>
    </div>
  `;

  return overlay;
};

const captureFaceBlob = async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Tu navegador no permite abrir la camara para validacion facial.");
  }

  const overlay = buildFaceCaptureModal();
  document.body.appendChild(overlay);

  const video = overlay.querySelector("[data-face-video]");
  const canvas = overlay.querySelector("[data-face-canvas]");
  const status = overlay.querySelector("[data-face-status]");
  const captureButton = overlay.querySelector("[data-face-capture]");
  const cancelButton = overlay.querySelector("[data-face-cancel]");
  let stream;

  const close = () => {
    stream?.getTracks().forEach((track) => track.stop());
    overlay.remove();
  };

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        height: { ideal: 720 },
        width: { ideal: 960 },
      },
    });
    video.srcObject = stream;
    status.textContent = "Mira de frente a la camara con buena luz.";
  } catch (error) {
    close();
    throw new Error("No se pudo abrir la camara. Revisa permisos del navegador.");
  }

  return new Promise((resolve, reject) => {
    cancelButton.addEventListener("click", () => {
      close();
      reject(new Error("El registro facial es obligatorio para terminar el registro."));
    });

    captureButton.addEventListener("click", () => {
      const width = video.videoWidth || 960;
      const height = video.videoHeight || 720;
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(video, 0, 0, width, height);
      status.textContent = "Registrando rostro...";
      canvas.toBlob((blob) => {
        close();
        if (!blob) {
          reject(new Error("No se pudo capturar el rostro."));
          return;
        }

        resolve(blob);
      }, "image/jpeg", 0.9);
    });
  });
};

const registerFace = async (token) => {
  const blob = await captureFaceBlob();
  const formData = new FormData();
  formData.append("faceImage", blob, "face-register.jpg");

  const response = await fetch("/api/v1/face/register", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    throw new Error(data.message || "No se pudo registrar el rostro.");
  }

  return data;
};

// Envia al usuario al dashboard correspondiente segun su rol.
const redirectToDashboard = (user) => {
  const dashboards = {
    Coordinador: "./coordinador-dashboard.html",
    Profesor: "./profesor-dashboard.html",
    Acudiente: "./padre-dashboard.html",
  };

  window.location.href = dashboards[user?.role] || "./padre-dashboard.html";
};

// Ejecuta login o registro contra la API.
const submitAuth = async (payload) => {
  const endpoint = currentMode === "login" ? "login" : "register";
  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "No se pudo completar la solicitud.");
  }

  return data;
};

// Maneja el envio del formulario completo: valida, autentica, guarda sesion y redirige.
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage();

  const payload = getFormData();
  const validationError = validatePayload(payload);

  if (validationError) {
    showMessage(validationError, "error");
    return;
  }

  try {
    setLoading(true);
    const data = await submitAuth(payload);
    saveSession(data);
    if (currentMode === "register" && data.user?.role === "Acudiente") {
      showMessage("Cuenta creada. Falta registrar tu rostro para terminar.", "info");
      const faceData = await registerFace(data.token);
      saveSession({
        token: data.token,
        user: faceData.user || data.user,
      });
    }
    showMessage(
      currentMode === "login"
        ? "Inicio de sesion correcto. Ya puedes continuar al sistema."
        : "Registro y biometria creados correctamente. Tu sesion quedo iniciada.",
      "success",
    );
    form.reset();
    await showSessionTransition({
      title: "Acceso confirmado",
      message: "Estamos preparando tu panel con la informacion de SchoolMed.",
      detail: data.user?.role || "Sesion activa",
    });
    redirectToDashboard(data.user);
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    setLoading(false);
  }
});

// Tabs superiores para alternar entre login y registro.
tabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

// Boton de ayuda inferior para cambiar de modo desde el texto.
modeHelper.addEventListener("click", (event) => {
  const switchButton = event.target.closest("[data-switch-mode]");
  if (switchButton) {
    setMode(switchButton.dataset.switchMode);
  }
});

// Estado inicial de la pantalla de acceso.
setMode("login");
