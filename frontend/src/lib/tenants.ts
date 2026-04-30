export interface Tenant {
  name: string;
  slug: string;
  primaryColor: string;
  logo: string;
  industry: string;
  domain: string;
}

export const tenants: Record<string, Omit<Tenant, "domain">> = {
  "klabin.com.br": {
    name: "Klabin S.A.", // tenant mantém o nome real da empresa cliente
    slug: "klabin",
    primaryColor: "#16a34a",
    logo: "KL",
    industry: "Papel & Embalagens",
  },
  "empresaa.com": {
    name: "Empresa A",
    slug: "empresa-a",
    primaryColor: "#2563eb",
    logo: "A",
    industry: "Tecnologia",
  },
  "empresab.com": {
    name: "Empresa B",
    slug: "empresa-b",
    primaryColor: "#7c3aed",
    logo: "B",
    industry: "Finanças",
  },
  "dataspeak.com.br": {
    name: "DataSpeak",
    slug: "dataspeak",
    primaryColor: "#e11d48",
    logo: "DS",
    industry: "Dados & BI",
  },
  "demo.com": {
    name: "Demo Corp",
    slug: "demo",
    primaryColor: "#f59e0b",
    logo: "DC",
    industry: "Demo",
  },
};

export function getTenantFromEmail(email: string): Tenant | null {
  if (!email || !email.includes("@")) return null;
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return null;
  const tenant = tenants[domain];
  return tenant ? { ...tenant, domain } : null;
}
