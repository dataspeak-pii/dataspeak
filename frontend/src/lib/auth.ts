import { getTenantFromEmail, type Tenant } from "./tenants";

export interface Session {
  email: string;
  name: string;
  tenant: Tenant;
  loginAt: string;
}

interface StoredUser {
  name: string;
  email: string;
  password: string;
  tenantSlug: string;
  createdAt: string;
}

const USERS_KEY = "mt_users";
const SESSION_KEY = "mt_session";
const COOKIE_NAME = "mt_session";

// ── LocalStorage helpers ──────────────────────────────────────────────────────

function getUsers(): Record<string, StoredUser> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, StoredUser>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ── Cookie helpers (used by middleware) ───────────────────────────────────────

function setCookie(value: string) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=86400; SameSite=Lax`;
}

function clearCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

// ── Session ───────────────────────────────────────────────────────────────────

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  clearCookie();
}

// ── Mock API ──────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function mockLogin(email: string, password: string): Promise<Session> {
  await delay(1200);

  const tenant = getTenantFromEmail(email);
  if (!tenant) throw new Error("Empresa não identificada. Verifique o domínio do seu e-mail.");

  const users = getUsers();
  const user = users[email.toLowerCase()];

  if (!user) throw new Error("Credenciais inválidas. Verifique seu e-mail e senha.");
  if (user.password !== password) throw new Error("Credenciais inválidas. Verifique seu e-mail e senha.");

  const session: Session = {
    email,
    name: user.name,
    tenant,
    loginAt: new Date().toISOString(),
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  setCookie(JSON.stringify(session));
  return session;
}

export async function mockRegister(name: string, email: string, password: string): Promise<{ tenant: Tenant }> {
  await delay(1200);

  if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");

  const tenant = getTenantFromEmail(email);
  if (!tenant) throw new Error("Empresa não identificada. Utilize um e-mail corporativo válido.");

  const users = getUsers();
  const key = email.toLowerCase();
  if (users[key]) throw new Error("Este e-mail já está cadastrado.");

  users[key] = { name, email: key, password, tenantSlug: tenant.slug, createdAt: new Date().toISOString() };
  saveUsers(users);
  return { tenant };
}

export async function mockForgotPassword(email: string): Promise<{ email: string; tenant: Tenant }> {
  await delay(1000);
  const tenant = getTenantFromEmail(email);
  if (!tenant) throw new Error("Empresa não identificada para este domínio.");
  return { email, tenant };
}
