import type { Alternativa } from "@/lib/diagnostico/types";

/**
 * 10 perguntas principais do diagnóstico (§5.3 do doc).
 * Pontuação fixa: A=3, B=2, C=1, D=0. Total máximo = 30.
 */

export interface AlternativaItem {
  key: Alternativa;
  texto: string;
}

export interface Pergunta {
  id: string;
  ordem: number;
  enunciado: string;
  alternativas: AlternativaItem[];
}

export const PERGUNTAS: Pergunta[] = [
  {
    id: "q1",
    ordem: 1,
    enunciado: "Hoje, como você costuma escolher o que vai estudar?",
    alternativas: [
      { key: "A", texto: "Sigo um plano organizado por prioridade" },
      { key: "B", texto: "Escolho com base no edital ou no que acho mais importante" },
      { key: "C", texto: "Estudo o que aparece ou o que sinto que preciso no dia" },
      { key: "D", texto: "Não tenho muita clareza sobre o que estudar primeiro" },
    ],
  },
  {
    id: "q2",
    ordem: 2,
    enunciado: "Com que frequência você consegue manter uma rotina de estudos?",
    alternativas: [
      { key: "A", texto: "Estudo quase todos os dias ou tenho uma rotina bem definida" },
      { key: "B", texto: "Estudo algumas vezes por semana, mas nem sempre com regularidade" },
      { key: "C", texto: "Tento estudar, mas minha rotina muda muito" },
      { key: "D", texto: "Quase nunca consigo manter constância" },
    ],
  },
  {
    id: "q3",
    ordem: 3,
    enunciado: "Quando você estuda um conteúdo novo, qual é sua principal forma de aprender?",
    alternativas: [
      { key: "A", texto: "Faço questões, reviso erros e volto na teoria quando preciso" },
      { key: "B", texto: "Leio ou assisto aula e depois faço algumas questões" },
      { key: "C", texto: "Leio, grifo, resumo ou assisto aula, mas faço poucas questões" },
      { key: "D", texto: "Normalmente só consumo teoria e quase não pratico" },
    ],
  },
  {
    id: "q4",
    ordem: 4,
    enunciado: "Você costuma revisar os conteúdos depois de alguns dias?",
    alternativas: [
      { key: "A", texto: "Sim, tenho revisões programadas" },
      { key: "B", texto: "Às vezes reviso, mas sem muita organização" },
      { key: "C", texto: "Só reviso quando percebo que esqueci" },
      { key: "D", texto: "Quase nunca reviso" },
    ],
  },
  {
    id: "q5",
    ordem: 5,
    enunciado: "Quando erra uma questão, o que você faz?",
    alternativas: [
      {
        key: "A",
        texto: "Analiso o erro e identifico o motivo: conteúdo, interpretação ou falta de atenção",
      },
      { key: "B", texto: "Leio o comentário e tento entender" },
      { key: "C", texto: "Vejo a resposta certa e sigo para a próxima" },
      { key: "D", texto: "Não tenho o hábito de analisar meus erros" },
    ],
  },
  {
    id: "q6",
    ordem: 6,
    enunciado: "Você sente que esquece muito do que estudou?",
    alternativas: [
      { key: "A", texto: "Não muito, porque reviso e pratico com frequência" },
      { key: "B", texto: "Às vezes, principalmente assuntos que vejo pouco" },
      { key: "C", texto: "Sim, esqueço bastante coisa depois de alguns dias" },
      { key: "D", texto: "Sim, parece que estudo e depois preciso começar tudo de novo" },
    ],
  },
  {
    id: "q7",
    ordem: 7,
    enunciado: "Como você se sente diante do edital de Enfermagem?",
    alternativas: [
      { key: "A", texto: "Sei o que priorizar e o que pode esperar" },
      { key: "B", texto: "Entendo o edital, mas às vezes me sinto perdido(a)" },
      { key: "C", texto: "Acho muito conteúdo e tenho dificuldade de decidir por onde começar" },
      { key: "D", texto: "Sinto que nunca vou dar conta de tudo" },
    ],
  },
  {
    id: "q8",
    ordem: 8,
    enunciado: "Você costuma estudar com base no seu desempenho?",
    alternativas: [
      { key: "A", texto: "Sim, foco mais nos assuntos em que erro ou tenho dificuldade" },
      { key: "B", texto: "Tento fazer isso, mas nem sempre acompanho meus resultados" },
      { key: "C", texto: "Sei mais ou menos minhas dificuldades, mas não uso isso para planejar" },
      { key: "D", texto: "Não acompanho meu desempenho de forma clara" },
    ],
  },
  {
    id: "q9",
    ordem: 9,
    enunciado: "Quando você tem pouco tempo para estudar, o que costuma fazer?",
    alternativas: [
      { key: "A", texto: "Priorizo questões e conteúdos de maior impacto" },
      { key: "B", texto: "Estudo o que considero mais urgente" },
      { key: "C", texto: "Tento estudar um pouco de tudo" },
      { key: "D", texto: "Fico travado(a) sem saber o que escolher" },
    ],
  },
  {
    id: "q10",
    ordem: 10,
    enunciado: "Qual frase mais combina com sua realidade hoje?",
    alternativas: [
      { key: "A", texto: "Eu estudo com método e quero melhorar minha performance" },
      { key: "B", texto: "Eu estudo, mas sinto que poderia aproveitar melhor meu tempo" },
      { key: "C", texto: "Eu me esforço, mas sinto que meu estudo não rende o suficiente" },
      { key: "D", texto: "Eu me sinto perdido(a), sobrecarregado(a) e sem direção" },
    ],
  },
];
