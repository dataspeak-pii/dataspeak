import { API_URL } from "./config";
import type { QueryRequest, QueryResponse } from "./types";

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function postQuery(payload: QueryRequest): Promise<QueryResponse> {
  let res: Response;

  try {
    res = await fetch(`${API_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError(
      `Não consegui conectar ao backend. Verifique se ele está rodando em ${API_URL}.`
    );
  }

  if (!res.ok) {
    let detail = `Erro ${res.status}`;

    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      // mantém erro genérico
    }

    throw new ApiError(detail, res.status);
  }

  try {
    return (await res.json()) as QueryResponse;
  } catch {
    throw new ApiError("Resposta do backend não é um JSON válido.");
  }
}
