const API_BASE_URL = "/api/auth";

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

const showMessage = (text, type = "info") => {
  const styles = {
    error: "border-red-300/30 bg-red-400/10 text-red-100",
    success: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
    info: "border-sky-300/30 bg-sky-400/10 text-sky-100",
  };

  messageBox.className = `rounded-2xl border px-4 py-3 text-sm font-semibold ${styles[type]}`;
  messageBox.textContent = text;
};

const hideMessage = () => {
  messageBox.className =
    "hidden rounded-2xl border px-4 py-3 text-sm font-semibold";
  messageBox.textContent = "";
};

const setLoading = (isLoading) => {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading
    ? currentMode === "login"
      ? "Ingresando..."
      : "Registrando..."
    : modeContent[currentMode].button;
};

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

const saveSession = ({ token, user }) => {
  localStorage.setItem("schoolmed_token", token);
  localStorage.setItem("schoolmed_user", JSON.stringify(user));
};

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
    showMessage(
      currentMode === "login"
        ? "Inicio de sesion correcto. Ya puedes continuar al sistema."
        : "Registro creado correctamente. Tu sesion quedo iniciada.",
      "success",
    );
    form.reset();
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    setLoading(false);
  }
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

modeHelper.addEventListener("click", (event) => {
  const switchButton = event.target.closest("[data-switch-mode]");
  if (switchButton) {
    setMode(switchButton.dataset.switchMode);
  }
});

setMode("login");
