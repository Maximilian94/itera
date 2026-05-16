"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import Image from "next/image";
import { PERGUNTAS } from "@/data/diagnostico/perguntas";
import {
  PERGUNTAS_QUALIFICACAO,
  type QualificacaoFieldKey,
  type QualificacaoValue,
} from "@/data/diagnostico/qualificacao";
import { computeResultado } from "@/lib/diagnostico/scoring";
import { shuffleAlternativas } from "@/lib/diagnostico/shuffle-perguntas";
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
import { CheckpointScreen } from "./CheckpointScreen";
import { LeadCaptureScreen, type LeadCaptureValues } from "./LeadCaptureScreen";
import { PerguntaScreen } from "./PerguntaScreen";
import { ProgressBar } from "./ProgressBar";
import { QualificacaoScreen } from "./QualificacaoScreen";
import { ResultadoScreen } from "./ResultadoScreen";
import { WelcomeScreen } from "./WelcomeScreen";

type Step =
  | { kind: "welcome" }
  | { kind: "pergunta"; index: number }
  | { kind: "checkpoint" }
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
  email: string | null;
  eventId: string;
  submitting: boolean;
  errorMessage: string | null;
  checkpointSeen: boolean;
}

const CHECKPOINT_AFTER_INDEX = Math.floor(PERGUNTAS.length / 2) - 1;

type Action =
  | { type: "iniciar" }
  | { type: "responder_pergunta"; perguntaId: string; alt: Alternativa }
  | { type: "goto_pergunta"; index: number }
  | { type: "analise_concluida" }
  | { type: "lead_submit_inicio" }
  | { type: "lead_submit_sucesso"; leadId: string; email: string }
  | { type: "lead_submit_erro"; mensagem: string }
  | {
      type: "responder_qualificacao";
      field: QualificacaoFieldKey;
      value: QualificacaoValue;
    }
  | { type: "goto_qualificacao"; index: number }
  | { type: "qualificacao_submit_inicio" }
  | { type: "qualificacao_concluida" }
  | { type: "checkpoint_concluido" }
  | { type: "restore"; persisted: PersistedState };

const STORAGE_KEY = "diagnostico_wizard_v1";

interface PersistedState {
  step: Step;
  respostas: Record<string, Alternativa>;
  qualificacao: Partial<Record<QualificacaoFieldKey, QualificacaoValue>>;
  resultado: DiagnosticoResultado | null;
  leadId: string | null;
  email: string | null;
  eventId: string;
  checkpointSeen: boolean;
}

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed?.step || !parsed.eventId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePersisted(state: State) {
  if (typeof window === "undefined") return;
  try {
    const payload: PersistedState = {
      step: state.step,
      respostas: state.respostas,
      qualificacao: state.qualificacao,
      resultado: state.resultado,
      leadId: state.leadId,
      email: state.email,
      eventId: state.eventId,
      checkpointSeen: state.checkpointSeen,
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage cheio ou bloqueado — falha silenciosa.
  }
}

function clearPersisted() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function makeInitialState(): State {
  return {
    step: { kind: "welcome" },
    respostas: {},
    qualificacao: {},
    resultado: null,
    leadId: null,
    email: null,
    eventId: typeof crypto !== "undefined" ? crypto.randomUUID() : fallbackUuid(),
    submitting: false,
    errorMessage: null,
    checkpointSeen: false,
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

      // Detour pelo checkpoint na primeira vez que atingir o meio do quiz.
      // Após "voltar" e re-responder, checkpointSeen previne loop.
      const hitsCheckpoint =
        currentIndex === CHECKPOINT_AFTER_INDEX && !state.checkpointSeen;

      let nextStep: Step;
      if (currentIndex >= lastIndex) {
        nextStep = { kind: "analyzing" };
      } else if (hitsCheckpoint) {
        nextStep = { kind: "checkpoint" };
      } else {
        nextStep = { kind: "pergunta", index: nextIndex };
      }

      // Tela de análise computa resultado em paralelo. Aqui já gravamos
      // pra que esteja pronto antes de avançar pro lead capture.
      const resultado =
        currentIndex >= lastIndex ? computeResultado(respostas) : state.resultado;

      return { ...state, respostas, resultado, step: nextStep };
    }

    case "checkpoint_concluido": {
      return {
        ...state,
        checkpointSeen: true,
        step: { kind: "pergunta", index: CHECKPOINT_AFTER_INDEX + 1 },
      };
    }

    case "goto_pergunta": {
      const clamped = Math.max(0, Math.min(action.index, PERGUNTAS.length - 1));
      return { ...state, step: { kind: "pergunta", index: clamped } };
    }

    case "goto_qualificacao": {
      const clamped = Math.max(
        0,
        Math.min(action.index, PERGUNTAS_QUALIFICACAO.length - 1),
      );
      return { ...state, step: { kind: "qualificacao", index: clamped } };
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
        email: action.email,
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

    case "restore": {
      return {
        ...state,
        step: action.persisted.step,
        respostas: action.persisted.respostas ?? {},
        qualificacao: action.persisted.qualificacao ?? {},
        resultado: action.persisted.resultado ?? null,
        leadId: action.persisted.leadId ?? null,
        email: action.persisted.email ?? null,
        eventId: action.persisted.eventId,
        checkpointSeen: action.persisted.checkpointSeen ?? false,
      };
    }

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
  // Shuffle das alternativas uma vez por sessão (lazy init). Mantém a ordem
  // estável entre re-renders e dentro do mesmo wizard run.
  const [perguntas] = useState(() => shuffleAlternativas(PERGUNTAS));

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

        dispatch({
          type: "lead_submit_sucesso",
          leadId: res.leadId,
          email: values.email,
        });
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

  // Voltar = back do browser. O listener de popstate abaixo despacha
  // goto_* com base na entry anterior. Centralizar aqui mantém browser-back
  // e botão "Voltar" usando o mesmo caminho.
  const handleVoltar = useCallback(() => {
    window.history.back();
  }, []);

  const handleCheckpointContinuar = useCallback(() => {
    dispatch({ type: "checkpoint_concluido" });
  }, []);

  // Restaura estado persistido na primeira montagem (refresh / nova aba
  // com sessionStorage compartilhado). Initial render é sempre default pra
  // evitar mismatch de hidratação — o restore acontece após o mount.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const persisted = loadPersisted();
    if (persisted) {
      dispatch({ type: "restore", persisted });
    }
  }, []);

  // Persiste a cada mudança de estado. Limpa ao chegar no resultado.
  useEffect(() => {
    if (state.step.kind === "resultado") {
      clearPersisted();
      return;
    }
    if (state.step.kind === "welcome") {
      // Welcome é estado inicial — não vale a pena salvar.
      return;
    }
    savePersisted(state);
  }, [state]);

  // Skip do push pra ações que vieram de popstate (back do browser).
  const skipPushRef = useRef(false);

  useEffect(() => {
    if (skipPushRef.current) {
      skipPushRef.current = false;
      return;
    }
    if (state.step.kind === "pergunta") {
      window.history.pushState(
        { wizardStep: `p${state.step.index}` },
        "",
      );
    } else if (state.step.kind === "qualificacao") {
      window.history.pushState(
        { wizardStep: `q${state.step.index}` },
        "",
      );
    }
  }, [state.step]);

  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      const wizardStep = (e.state as { wizardStep?: string } | null)
        ?.wizardStep;
      if (!wizardStep) return;
      skipPushRef.current = true;
      if (wizardStep.startsWith("p")) {
        const idx = Number(wizardStep.slice(1));
        if (Number.isFinite(idx)) {
          dispatch({ type: "goto_pergunta", index: idx });
        }
      } else if (wizardStep.startsWith("q")) {
        const idx = Number(wizardStep.slice(1));
        if (Number.isFinite(idx)) {
          dispatch({ type: "goto_qualificacao", index: idx });
        }
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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
      const startedAt = Date.now();
      try {
        await updateQualificacao(leadId, payload);
        if (!cancelled) {
          analytics.capture("wizard_qualificacao_concluida", { leadId });
        }
      } catch {
        // Qualificação é bonus — não bloqueia experiência.
      }
      // Garante que a tela de análise apareça por um mínimo, mesmo que o
      // PATCH retorne rápido — preserva o feel de "sistema analisando".
      const elapsed = Date.now() - startedAt;
      const remaining = MIN_ANALYSIS_MS - elapsed;
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      if (!cancelled) {
        dispatch({ type: "qualificacao_concluida" });
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
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.svg"
            alt=""
            width={28}
            height={28}
            priority
            className="size-7"
          />
          <span className="text-sm font-semibold text-cyan-700">
            Maximize Enfermagem
          </span>
        </div>
        {progress ? (
          <div className="w-full sm:ml-auto sm:max-w-xs">
            <ProgressBar
              current={progress.current}
              total={progress.total}
              label={progress.label}
            />
          </div>
        ) : null}
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        {renderStep(state, perguntas, {
          onStart: handleStart,
          onResponder: handleResponder,
          onAnalyzingDone: handleAnalyzingDone,
          onLeadSubmit: handleLeadSubmit,
          onQualificacao: handleQualificacao,
          onVoltar: handleVoltar,
          onCheckpointContinuar: handleCheckpointContinuar,
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
  onVoltar: () => void;
  onCheckpointContinuar: () => void;
}

function renderStep(
  state: State,
  perguntas: typeof PERGUNTAS,
  h: Handlers,
) {
  switch (state.step.kind) {
    case "welcome":
      return <WelcomeScreen onStart={h.onStart} />;

    case "pergunta": {
      const pergunta = perguntas[state.step.index];
      return (
        <PerguntaScreen
          key={pergunta.id}
          pergunta={pergunta}
          selecionada={state.respostas[pergunta.id]}
          onResponder={(alt) => h.onResponder(pergunta.id, pergunta.ordem, alt)}
          onVoltar={state.step.index > 0 ? h.onVoltar : undefined}
        />
      );
    }

    case "checkpoint":
      return (
        <CheckpointScreen
          current={CHECKPOINT_AFTER_INDEX + 1}
          total={PERGUNTAS.length}
          onContinue={h.onCheckpointContinuar}
        />
      );

    case "analyzing":
      return (
        <AnalyzingScreen
          onComplete={h.onAnalyzingDone}
          durationMs={3500}
        />
      );

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
          key={pergunta.field}
          pergunta={pergunta}
          ordemTotal={PERGUNTAS_QUALIFICACAO.length}
          selecionada={state.qualificacao[pergunta.field]}
          onResponder={(value) => h.onQualificacao(pergunta.field, value)}
          onVoltar={state.step.index > 0 ? h.onVoltar : undefined}
        />
      );
    }

    case "submitting_qualificacao":
      return (
        <AnalyzingScreen
          stages={QUALIFICACAO_STAGES}
          stageDurationMs={1800}
          eyebrow="Análise aprofundada"
        />
      );

    case "resultado":
      return state.resultado && state.email ? (
        <ResultadoScreen resultado={state.resultado} email={state.email} />
      ) : null;
  }
}

const QUALIFICACAO_STAGES = [
  "Mapeando padrões nas suas respostas",
  "Cruzando com perfis de aprovados",
  "Preparando suas dicas personalizadas",
] as const;

const MIN_ANALYSIS_MS = 5400;

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
    case "checkpoint":
    case "submitting_qualificacao":
    case "resultado":
      return null;
  }
}

