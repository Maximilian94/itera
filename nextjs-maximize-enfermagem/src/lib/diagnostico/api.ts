import type {
  DiagnosticoSubmissionPayload,
  QualificacaoPayload,
} from "./types";

/**
 * Cliente HTTP do wizard. Isola fetch da UI.
 *
 * Endpoints:
 *  - POST  /leads/diagnostico
 *  - PATCH /leads/:leadId/qualificacao
 */

const getApiBaseUrl = () => {
  const url =
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.API_URL ??
    "http://localhost:3000";
  return url.replace(/\/+$/, "");
};

export interface SubmitDiagnosticoResponse {
  ok: true;
  leadId: string;
}

export async function submitDiagnostico(
  payload: DiagnosticoSubmissionPayload,
): Promise<SubmitDiagnosticoResponse> {
  const res = await fetch(`${getApiBaseUrl()}/leads/diagnostico`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await safeReadError(res);
    throw new Error(`submitDiagnostico falhou (${res.status}): ${detail}`);
  }

  return (await res.json()) as SubmitDiagnosticoResponse;
}

export interface UpdateQualificacaoResponse {
  ok: true;
}

export async function updateQualificacao(
  leadId: string,
  qualificacao: QualificacaoPayload,
): Promise<UpdateQualificacaoResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/leads/${encodeURIComponent(leadId)}/qualificacao`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qualificacao }),
    },
  );

  if (!res.ok) {
    const detail = await safeReadError(res);
    throw new Error(`updateQualificacao falhou (${res.status}): ${detail}`);
  }

  return (await res.json()) as UpdateQualificacaoResponse;
}

async function safeReadError(res: Response): Promise<string> {
  try {
    const json = await res.json();
    if (typeof json?.message === "string") return json.message;
    if (Array.isArray(json?.message)) return json.message.join(", ");
    return JSON.stringify(json);
  } catch {
    return res.statusText || "erro desconhecido";
  }
}
