export type Exercicio = {
  nome: string;
  grupo: string;
  series: number;
  reps: string;
  descanso: string;
};

export type Dia = {
  id: string;
  curto: string;
  nome: string;
  treino: string | null;
  concluido: boolean;
  exercicios: Exercicio[];
};

export const aluno = {
  nome: "Teste Maximo",
  iniciais: "TM",
  plano: "Mensal",
  status: "Vencida" as const,
  vencimento: "10/08/2026",
  valor: "R$ 129,90",
};

const treinoA: Exercicio[] = [
  { nome: "Abdominal na Polia Alta", grupo: "Abdômen", series: 4, reps: "12", descanso: "60s" },
  { nome: "Abdominal Rodinha", grupo: "Abdômen", series: 4, reps: "12", descanso: "60s" },
  { nome: "Agachamento Búlgaro", grupo: "Quadríceps", series: 4, reps: "12", descanso: "60s" },
  { nome: "Leg Press 45º", grupo: "Quadríceps", series: 3, reps: "10", descanso: "90s" },
];

export const semana: Dia[] = [
  { id: "seg", curto: "Seg", nome: "Segunda", treino: "Treino A", concluido: true, exercicios: treinoA },
  { id: "ter", curto: "Ter", nome: "Terça", treino: "Treino A", concluido: true, exercicios: treinoA },
  { id: "qua", curto: "Qua", nome: "Quarta", treino: "Treino A", concluido: true, exercicios: treinoA },
  { id: "qui", curto: "Qui", nome: "Quinta", treino: null, concluido: false, exercicios: [] },
  { id: "sex", curto: "Sex", nome: "Sexta", treino: "Treino A", concluido: false, exercicios: treinoA },
  { id: "sab", curto: "Sáb", nome: "Sábado", treino: "Treino A", concluido: true, exercicios: treinoA },
  { id: "dom", curto: "Dom", nome: "Domingo", treino: null, concluido: false, exercicios: [] },
];
