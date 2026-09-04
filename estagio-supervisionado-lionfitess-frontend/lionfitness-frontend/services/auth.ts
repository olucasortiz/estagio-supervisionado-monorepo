import { API_BASE_URL, AUTH_STORAGE_KEY } from "./api";

export type AuthRole = "ADMIN" | "USER" | "PERSONAL_TRAINER" | string;

export type AuthUser = {
  id: string | number;
  name: string;
  email: string;
  role: AuthRole;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

const AUTH_CHANGE_EVENT = "lionfitness-auth-change";

/* =========================
   CACHE (resolve loop infinito)
========================= */
let cachedSession: AuthSession | null = null;

/* =========================
   REDIRECIONAMENTO POR ROLE
========================= */
export function getDefaultRouteByRole(role?: string | null) {
  // Console log para você debugar se a role está vindo certinha
  console.log("Verificando rota para a role:", role);

  if (role === "ADMIN") {
    return "/dashboard";
  }

  // ADICIONE ESTA CONDIÇÃO AQUI:
  if (role === "OPERATIONAL" || role === "USER") {
    return "/aluno";
  }

  if (role === "PERSONAL_TRAINER") {
    return "/personal";
  }

  // Se não for nenhum dos acima, ele volta pro login
  return "/login";
}
/* =========================
   LOGIN REQUEST
========================= */
export async function loginRequest(email: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const rawText = await response.text();
  let payload: unknown = null;

  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = rawText;
    }
  }

  if (!response.ok) {
    const parsed = payload as
      | string
      | { message?: string; error?: string; detail?: string; details?: string }
      | null;

    const backendMessage =
      typeof parsed === "string"
        ? parsed
        : parsed?.message || parsed?.error || parsed?.detail || parsed?.details;

    throw new Error(backendMessage || "Não foi possível entrar no sistema.");
  }

  const parsedData = payload as AuthSession | { data?: AuthSession } | null;
  const data = (parsedData && "data" in parsedData ? parsedData.data || null : parsedData) as AuthSession | null;

  if (!data?.token || !data?.user) {
    throw new Error("Resposta de autenticação inválida.");
  }

  return data;
}

/* =========================
   GET SESSION (CORRIGIDO)
========================= */
export function getStoredAuthSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!rawSession) {
      cachedSession = null;
      return null;
    }

    const parsed = JSON.parse(rawSession) as Partial<AuthSession>;

    if (!parsed?.token || !parsed?.user) {
      cachedSession = null;
      return null;
    }

    // 🔥 evita recriar objeto (ESSENCIAL)
    if (
      cachedSession &&
      cachedSession.token === parsed.token &&
      JSON.stringify(cachedSession.user) === JSON.stringify(parsed.user)
    ) {
      return cachedSession;
    }

    cachedSession = {
      token: parsed.token,
      user: parsed.user,
    };

    return cachedSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    cachedSession = null;
    return null;
  }
}

/* =========================
   SAVE SESSION
========================= */
export function saveAuthSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  cachedSession = session; // 🔥 mantém cache sincronizado
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

/* =========================
   CLEAR SESSION
========================= */
export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  cachedSession = null; // 🔥 limpa cache
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

/* =========================
   SUBSCRIBE
========================= */
export function subscribeToAuthSession(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => {
    onChange();
  };

  window.addEventListener("storage", handleChange);
  window.addEventListener(AUTH_CHANGE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(AUTH_CHANGE_EVENT, handleChange);
  };
}