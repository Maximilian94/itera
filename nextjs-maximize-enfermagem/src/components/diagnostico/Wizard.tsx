"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { PERGUNTAS } from "@/data/diagnostico/perguntas";
import {
  PERGUNTAS_QUALIFICACAO,
  type QualificacaoFieldKey,
  type QualificacaoValue,
} from "@/data/diagnostico/qualificacao";
import { computeResultado } from "@/lib/diagnostico/scoring";
import {
  submitDiagnostico,
  updateQualificacao,
} from "@/lib/diagnostico/api";
import { analytics } from "@/lib/analytics";
import {
  firePixelViewContent,
} from "@/lib/meta-pixel/events";
import type {
  Alternativa,
  DiagnosticoResultado,
  QualificacaoPayload,
} from "@/lib/diagnostico/types";
import { AnalyzingScreen } from "./AnalyzingScreen";
import { LeadCaptureScreen, type LeadCaptureValues } from "./LeadCaptureScreen";
import { PerguntaScreen } from "./PerguntaScreen";
import { ProgressBar } from "./ProgressBar";
import { QualificacaoScreen } from "./QualificacaoScreen";
import { ResultadoScreen } from "./ResultadoScreen";
import { WelcomeScreen } from "./WelcomeScreen";

type Step =
  | { kind: "welcome" }
  | { kind: "pergunta"; index: number }
  | { kind: "analyzing" }
  | { kind: "lead_capture" }
  | { kind: "qualificacao"; index: number }
  | { kind: "submitting_qualificacao" }
  | { kind: "resultado" };

interface State {
  step: Step;
  respostas: Record<string, Alternativa>;
  qualificacao: Partial<Record<QualificacaoFieldKey, QualificacaoValue>>;
  resultado: DiagnosticoResultado | null;
  leadId: string | null;
  eventId: string;
  submitting: boolean;
  errorMessage: string | null;
}

type Action =
  | { type: "iniciar" }
  | { type: "responder_pergunta"; perguntaId: string; alt: Alternativa }
  | { type: "analise_concluida" }
  | { type: "lead_submit_inicio" }
  | { type: "lead_submit_sucesso"; leadId: string }
  | { type: "lead_submit_erro"; mensagem: string }
  | {
      type: "responder_qualificacao";
      field: QualificacaoFieldKey;
      value: QualificacaoValue;
    }
  | { type: "qualificacao_submit_inicio" }
  | { type: "qualificacao_concluida" };

function makeInitialState(): State {
  return {
    step: { kind: "welcome" },
    respostas: {},
    qualificacao: {},
    resultado: null,
    leadId: null,
    eventId: typeof crypto !== "undefined" ? crypto.randomUUID() : fallbackUuid(),
    submitting: false,
    errorMessage: null,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "iniciar":
      return { ...state, step: { kind: "pergunta", index: 0 } };

    case "responder_pergunta": {
      const respostas = { ...state.respostas, [action.perguntaId]: action.alt };
      const currentIndex =
        state.step.kind === "pergunta" ? state.step.index : 0;
      const nextIndex = currentIndex + 1;
      const lastIndex = PERGUNTAS.length - 1;

      const nextStep: Step =
        currentIndex >= lastIndex
          ? { kind: "analyzing" }
          : { kind: "pergunta", index: nextIndex };

      // Tela de análise computa resultado em paralelo. Aqui já gravamos
      // pra que esteja pronto antes de avançar pro lead capture.
      const resultado =
        currentIndex >= lastIndex ? computeResultado(respostas) : state.resultado;

      return { ...state, respostas, resultado, step: nextStep };
    }

    case "analise_concluida":
      return { ...state, step: { kind: "lead_capture" } };

    case "lead_submit_inicio":
      return { ...state, submitting: true, errorMessage: null };

    case "lead_submit_sucesso":
      return {
        ...state,
        submitting: false,
        leadId: action.leadId,
        step: { kind: "qualificacao", index: 0 },
      };

    case "lead_submit_erro":
      return { ...state, submitting: false, errorMessage: action.mensagem };

    case "responder_qualificacao": {
      const qualificacao = {
        ...state.qualificacao,
        [action.field]: action.value,
      };
      const currentIndex =
        state.step.kind === "qualificacao" ? state.step.index : 0;
      const nextIndex = currentIndex + 1;
      const lastIndex = PERGUNTAS_QUALIFICACAO.length - 1;

      const nextStep: Step =
        currentIndex >= lastIndex
          ? { kind: "submitting_qualificacao" }
          : { kind: "qualificacao", index: nextIndex };

      return { ...state, qualificacao, step: nextStep };
    }

    case "qualificacao_submit_inicio":
      return { ...state, step: { kind: "submitting_qualificacao" } };

    case "qualificacao_concluida":
      return { ...state, step: { kind: "resultado" } };

    default:
      return state;
  }
}

function fallbackUuid(): string {
  return Array.from({ length: 4 }, () => Math.random().toString(16).slice(2, 10)).join(
    "-",
  );
}

function isQualificacaoComplete(
  q: State["qualificacao"],
): q is QualificacaoPayload {
  return PERGUNTAS_QUALIFICACAO.every((p) => Boolean(q[p.field]));
}

export function Wizard() {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);

  const handleStart = useCallback(() => {
    analytics.capture("wizard_iniciado", { fonteLp: "edital" });
    firePixelViewContent();
    dispatch({ type: "iniciar" });
  }, []);

  const handleResponder = useCallback(
    (perguntaId: string, ordem: number, alt: Alternativa) => {
      analytics.capture("wizard_pergunta_respondida", {
        perguntaId,
        alternativa: alt,
        ordem,
      });
      dispatch({ type: "responder_pergunta", perguntaId, alt });
    },
    [],
  );

  const handleAnalyzingDone = useCallback(() => {
    dispatch({ type: "analise_concluida" });
  }, []);

  const handleLeadSubmit = useCallback(
    async (values: LeadCaptureValues) => {
      if (!state.resultado) return;

      dispatch({ type: "lead_submit_inicio" });
      try {
        const res = await submitDiagnostico({
          email: values.email,
          name: values.name,
          phone: values.phone,
          fonteLp: "edital",
          respostas: state.respostas,
          resultado: state.resultado,
          eventId: state.eventId,
          consentMarketing: values.consentMarketing,
        });

        analytics.capture("wizard_lead_capturado", {
          leadId: res.leadId,
          perfil: state.resultado.perfil.slug,
        });

        dispatch({ type: "lead_submit_sucesso", leadId: res.leadId });
      } catch (e) {
        const mensagem =
          e instanceof Error
            ? e.message
            : "Não conseguimos enviar agora. Tente novamente em instantes.";
        dispatch({ type: "lead_submit_erro", mensagem });
      }
    },
    [state.resultado, state.respostas, state.eventId],
  );

  const handleQualificacao = useCallback(
    (field: QualificacaoFieldKey, value: QualificacaoValue) => {
      dispatch({ type: "responder_qualificacao", field, value });
    },
    [],
  );

  // Quando entra em submitting_qualificacao, dispara PATCH e avança.
  // Guard com ref garante uma única chamada mesmo em StrictMode (double-mount).
  const qualificacaoRequestedRef = useRef(false);
  useEffect(() => {
    if (state.step.kind !== "submitting_qualificacao") return;
    if (!state.leadId) return;
    if (!isQualificacaoComplete(state.qualificacao)) return;
    if (qualificacaoRequestedRef.current) return;
    qualificacaoRequestedRef.current = true;

    const leadId = state.leadId;
    const payload = state.qualificacao;
    let cancelled = false;
    (async () => {
      try {
        await updateQualificacao(leadId, payload);
        if (!cancelled) {
          analytics.capture("wizard_qualificacao_concluida", { leadId });
        }
      } catch {
        // Qualificação é bonus — não bloqueia experiência.
      } finally {
        if (!cancelled) {
          dispatch({ type: "qualificacao_concluida" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state.step.kind, state.leadId, state.qualificacao]);

  // Captura wizard_resultado_visualizado quando entra na tela de resultado.
  useEffect(() => {
    if (state.step.kind !== "resultado" || !state.leadId || !state.resultado) {
      return;
    }
    analytics.capture("wizard_resultado_visualizado", {
      leadId: state.leadId,
      perfil: state.resultado.perfil.slug,
    });
  }, [state.step.kind, state.leadId, state.resultado]);

  const progress = computeProgress(state.step);

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <span className="text-sm font-semibold text-cyan-700">
          Maximize Enfermagem
        </span>
        {progress ? (
          <div className="ml-6 max-w-xs flex-1">
            <ProgressBar
              current={progress.current}
              total={progress.total}
              label={progress.label}
            />
          </div>
        ) : null}
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        {renderStep(state, {
          onStart: handleStart,
          onResponder: handleResponder,
          onAnalyzingDone: handleAnalyzingDone,
          onLeadSubmit: handleLeadSubmit,
          onQualificacao: handleQualificacao,
        })}
      </main>
    </div>
  );
}

interface Handlers {
  onStart: () => void;
  onResponder: (perguntaId: string, ordem: number, alt: Alternativa) => void;
  onAnalyzingDone: () => void;
  onLeadSubmit: (values: LeadCaptureValues) => Promise<void>;
  onQualificacao: (
    field: QualificacaoFieldKey,
    value: QualificacaoValue,
  ) => void;
}

function renderStep(state: State, h: Handlers) {
  switch (state.step.kind) {
    case "welcome":
      return <WelcomeScreen onStart={h.onStart} />;

    case "pergunta": {
      const pergunta = PERGUNTAS[state.step.index];
      return (
        <PerguntaScreen
          pergunta={pergunta}
          selecionada={state.respostas[pergunta.id]}
          onResponder={(alt) => h.onResponder(pergunta.id, pergunta.ordem, alt)}
        />
      );
    }

    case "analyzing":
      return <AnalyzingScreen onComplete={h.onAnalyzingDone} />;

    case "lead_capture":
      return (
        <LeadCaptureScreen
          eventId={state.eventId}
          onSubmit={h.onLeadSubmit}
          submitting={state.submitting}
          errorMessage={state.errorMessage ?? undefined}
        />
      );

    case "qualificacao": {
      const pergunta = PERGUNTAS_QUALIFICACAO[state.step.index];
      return (
        <QualificacaoScreen
          pergunta={pergunta}
          ordemTotal={PERGUNTAS_QUALIFICACAO.length}
          selecionada={state.qualificacao[pergunta.field]}
          onResponder={(value) => h.onQualificacao(pergunta.field, value)}
        />
      );
    }

    case "submitting_qualificacao":
      return <AnalyzingScreen onComplete={() => undefined} durationMs={999999} />;

    case "resultado":
      return state.resultado ? <ResultadoScreen resultado={state.resultado} /> : null;
  }
}

interface Progress {
  current: number;
  total: number;
  label: string;
}

function computeProgress(step: Step): Progress | null {
  switch (step.kind) {
    case "welcome":
      return null;
    case "pergunta":
      return {
        current: step.index + 1,
        total: PERGUNTAS.length,
        label: `Diagnóstico · ${step.index + 1} de ${PERGUNTAS.length}`,
      };
    case "analyzing":
    case "lead_capture":
      return {
        current: PERGUNTAS.length,
        total: PERGUNTAS.length,
        label: "Diagnóstico concluído",
      };
    case "qualificacao":
      return {
        current: step.index + 1,
        total: PERGUNTAS_QUALIFICACAO.length,
        label: `Contexto · ${step.index + 1} de ${PERGUNTAS_QUALIFICACAO.length}`,
      };
    case "submitting_qualificacao":
    case "resultado":
      return null;
  }
}

