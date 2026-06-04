import AsyncStorage from "@react-native-async-storage/async-storage";
import { getTenantFromEmail, type Tenant } from "./tenants";
import type { QueryHistoryItem } from "./types";

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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

async function getUsers(): Promise<Record<string, StoredUser>> {
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveUsers(users: Record<string, StoredUser>) {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function getSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveSession(session: Session) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}

// Igual ao frontend: só entra se a conta tiver sido criada antes.
// No navegador o frontend salva em localStorage; no Expo salvamos em AsyncStorage.
export async function mockLogin(email: string, password: string): Promise<Session> {
  await delay(1200);

  const normalizedEmail = normalizeEmail(email);

  const tenant = getTenantFromEmail(normalizedEmail);
  if (!tenant) {
    throw new Error("Empresa não identificada. Verifique o domínio do seu e-mail.");
  }

  const users = await getUsers();
  const user = users[normalizedEmail];

  if (!user) {
    throw new Error("Credenciais inválidas. Verifique seu e-mail e senha.");
  }

  if (user.password !== password) {
    throw new Error("Credenciais inválidas. Verifique seu e-mail e senha.");
  }

  const session: Session = {
    email: user.email,
    name: user.name,
    tenant,
    loginAt: new Date().toISOString(),
  };

  await saveSession(session);
  return session;
}

// Igual ao frontend: cria conta local com domínio permitido.
export async function mockRegister(
  name: string,
  email: string,
  password: string
): Promise<{ tenant: Tenant }> {
  await delay(1200);

  const normalizedEmail = normalizeEmail(email);

  if (!name.trim()) {
    throw new Error("Informe seu nome.");
  }

  if (!normalizedEmail) {
    throw new Error("Informe seu e-mail.");
  }

  if (password.length < 6) {
    throw new Error("A senha deve ter pelo menos 6 caracteres.");
  }

  const tenant = getTenantFromEmail(normalizedEmail);
  if (!tenant) {
    throw new Error("Empresa não identificada. Utilize um e-mail corporativo válido.");
  }

  const users = await getUsers();

  if (users[normalizedEmail]) {
    throw new Error("Este e-mail já está cadastrado.");
  }

  users[normalizedEmail] = {
    name: name.trim(),
    email: normalizedEmail,
    password,
    tenantSlug: tenant.slug,
    createdAt: new Date().toISOString(),
  };

  await saveUsers(users);
  return { tenant };
}

export async function mockForgotPassword(
  email: string
): Promise<{ email: string; tenant: Tenant }> {
  await delay(1000);

  const normalizedEmail = normalizeEmail(email);

  const tenant = getTenantFromEmail(normalizedEmail);
  if (!tenant) {
    throw new Error("Empresa não identificada para este domínio.");
  }

  return { email: normalizedEmail, tenant };
}

export function getHistoryKey(email: string) {
  return `ds_history_${normalizeEmail(email)}`;
}

export async function loadHistoryForEmail(
  email: string
): Promise<QueryHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(getHistoryKey(email));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveHistoryForEmail(
  email: string,
  history: QueryHistoryItem[]
) {
  await AsyncStorage.setItem(getHistoryKey(email), JSON.stringify(history));
}
