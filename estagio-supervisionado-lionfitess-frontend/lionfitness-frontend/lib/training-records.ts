// Tipos e formatações compartilhados por avaliação física e registro de cargas.

export type BodyFatMethod = "NONE" | "POLLOCK_3" | "POLLOCK_7" | "BIOIMPEDANCE";

export type Circumferences = Partial<Record<CircumferenceKey, number | null>>;
export type Skinfolds = Partial<Record<SkinfoldKey, number | null>>;

export type CircumferenceKey =
  | "chest" | "waist" | "abdomen" | "hip" | "rightArm" | "leftArm"
  | "rightThigh" | "leftThigh" | "rightCalf" | "leftCalf";

export type SkinfoldKey =
  | "chest" | "midaxillary" | "triceps" | "subscapular" | "abdominal" | "suprailiac" | "thigh";

export type AssessmentResults = {
  bmi: number | null;
  bmiClassification: string | null;
  skinfoldSum: number | null;
  bodyDensity: number | null;
  bodyFatPercent: number | null;
  fatMassKg: number | null;
  leanMassKg: number | null;
  waistHipRatio: number | null;
  waistHipRiskElevated: boolean | null;
  parqPositive: boolean | null;
};

export type PhysicalAssessment = {
  id: string;
  memberId: string;
  memberName?: string | null;
  assessmentDate: string | number[];
  sex: "M" | "F" | null;
  ageYears: number | null;
  objective: string | null;
  parqAnswers: boolean[] | null;
  healthNotes: string | null;
  restingHeartRate: number | null;
  systolicPressure: number | null;
  diastolicPressure: number | null;
  weightKg: number;
  heightCm: number;
  circumferences: Circumferences | null;
  bodyFatMethod: BodyFatMethod;
  skinfolds: Skinfolds | null;
  informedBodyFatPercent: number | null;
  notes: string | null;
  assessedByName: string | null;
  createdAt?: string | null;
  results: AssessmentResults;
};

export type LoadLog = {
  id: string;
  memberId: string;
  workoutExerciseId: string | null;
  exerciseName: string;
  equipment: string | null;
  setNumber: number;
  reps: number;
  loadKg: number;
  loggedAt: string | number[];
};

/** PAR-Q (Physical Activity Readiness Questionnaire), versão brasileira de 7 perguntas. */
export const PARQ_QUESTIONS = [
  "Algum médico já disse que você possui algum problema de coração e que só deveria realizar atividade física supervisionada por profissionais de saúde?",
  "Você sente dores no peito quando pratica atividade física?",
  "No último mês, você sentiu dores no peito quando praticou atividade física?",
  "Você apresenta desequilíbrio devido a tontura e/ou perda de consciência?",
  "Você possui algum problema ósseo ou articular que poderia ser piorado pela atividade física?",
  "Você toma atualmente algum medicamento para pressão arterial e/ou problema de coração?",
  "Sabe de alguma outra razão pela qual você não deve praticar atividade física?",
] as const;

export const CIRCUMFERENCE_FIELDS: { key: CircumferenceKey; label: string }[] = [
  { key: "chest", label: "Tórax" },
  { key: "waist", label: "Cintura" },
  { key: "abdomen", label: "Abdômen" },
  { key: "hip", label: "Quadril" },
  { key: "rightArm", label: "Braço direito" },
  { key: "leftArm", label: "Braço esquerdo" },
  { key: "rightThigh", label: "Coxa direita" },
  { key: "leftThigh", label: "Coxa esquerda" },
  { key: "rightCalf", label: "Panturrilha direita" },
  { key: "leftCalf", label: "Panturrilha esquerda" },
];

export const SKINFOLD_FIELDS: { key: SkinfoldKey; label: string }[] = [
  { key: "chest", label: "Peitoral" },
  { key: "midaxillary", label: "Axilar média" },
  { key: "triceps", label: "Tríceps" },
  { key: "subscapular", label: "Subescapular" },
  { key: "abdominal", label: "Abdominal" },
  { key: "suprailiac", label: "Suprailíaca" },
  { key: "thigh", label: "Coxa" },
];

export const BODY_FAT_METHODS: { value: BodyFatMethod; label: string; hint: string }[] = [
  { value: "POLLOCK_7", label: "Dobras: Pollock 7 dobras", hint: "Jackson & Pollock com 7 dobras e equação de Siri." },
  { value: "POLLOCK_3", label: "Dobras: Pollock 3 dobras", hint: "Homens: peitoral, abdominal e coxa. Mulheres: tríceps, suprailíaca e coxa." },
  { value: "BIOIMPEDANCE", label: "Bioimpedância", hint: "Informe o % de gordura medido pela balança de bioimpedância." },
  { value: "NONE", label: "Sem composição corporal", hint: "Registra apenas peso, altura, perímetros e sinais vitais." },
];

/** Sítios exigidos pelo protocolo escolhido (mesma regra do backend). */
export function requiredSkinfolds(method: BodyFatMethod, sex: "M" | "F" | ""): SkinfoldKey[] {
  if (method === "POLLOCK_7") return SKINFOLD_FIELDS.map((field) => field.key);
  if (method === "POLLOCK_3") return sex === "M" ? ["chest", "abdominal", "thigh"] : ["triceps", "suprailiac", "thigh"];
  return [];
}

export function methodLabel(method: BodyFatMethod | string | null | undefined): string {
  return BODY_FAT_METHODS.find((item) => item.value === method)?.label ?? "—";
}

export function toDate(value: string | number[] | null | undefined): Date | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0] = value;
    return new Date(year, (month ?? 1) - 1, day ?? 1, hour, minute);
  }
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateBr(value: string | number[] | null | undefined): string {
  const date = toDate(value);
  return date ? date.toLocaleDateString("pt-BR") : "—";
}

export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatKg(value: number | null | undefined): string {
  if (value == null) return "—";
  const number = Number(value);
  return `${number.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;
}

/** Diferença entre a avaliação atual e a anterior, já arredondada para exibição. */
export function delta(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current == null || previous == null) return null;
  return Math.round((Number(current) - Number(previous)) * 10) / 10;
}

/** Agrupa os registros por exercício + aparelho, do mais recente para o mais antigo. */
export type LoadSummary = {
  key: string;
  exerciseName: string;
  equipment: string | null;
  lastLoadKg: number;
  lastReps: number;
  lastLoggedAt: string | number[];
  maxLoadKg: number;
  firstLoadKg: number;
  sessions: number;
  entries: LoadLog[];
};

export function loadKey(exerciseName: string, equipment: string | null | undefined): string {
  return `${exerciseName.trim().toLowerCase()}|${(equipment ?? "").trim().toLowerCase()}`;
}

function dayKey(value: string | number[]): string {
  const date = toDate(value);
  return date ? date.toDateString() : String(value);
}

export function summarizeLoads(logs: LoadLog[]): LoadSummary[] {
  const groups = new Map<string, LoadLog[]>();
  for (const log of logs) {
    const key = loadKey(log.exerciseName, log.equipment);
    groups.set(key, [...(groups.get(key) ?? []), log]);
  }
  return [...groups.entries()].map(([key, entries]) => {
    const sorted = [...entries].sort((a, b) => (toDate(b.loggedAt)?.getTime() ?? 0) - (toDate(a.loggedAt)?.getTime() ?? 0));
    const latest = sorted[0];
    return {
      key,
      exerciseName: latest.exerciseName,
      equipment: latest.equipment,
      lastLoadKg: Number(latest.loadKg),
      lastReps: latest.reps,
      lastLoggedAt: latest.loggedAt,
      maxLoadKg: Math.max(...sorted.map((entry) => Number(entry.loadKg))),
      firstLoadKg: Number(sorted[sorted.length - 1].loadKg),
      sessions: new Set(sorted.map((entry) => dayKey(entry.loggedAt))).size,
      entries: sorted,
    };
  }).sort((a, b) => (toDate(b.lastLoggedAt)?.getTime() ?? 0) - (toDate(a.lastLoggedAt)?.getTime() ?? 0));
}
