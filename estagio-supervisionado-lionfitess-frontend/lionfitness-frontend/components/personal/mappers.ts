import {
  StudentViewModel,
  WorkoutSheetViewModel,
  WorkoutExerciseViewModel,
  CatalogExerciseViewModel,
} from "./types";

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function mapStudent(entry: unknown, index = 0): StudentViewModel {
  const member: Record<string, unknown> = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
  const name = readString(member.name, readString(member.nome, `Aluno ${index + 1}`));
  const rawCpf = readString(member.cpf, "—");

  const isInactive = member.active === false || member.isActive === false || member.is_active === false || member.situacao === "Inativo";
  const status = isInactive ? "Inativo" : "Ativo";

  const rawActiveSheetId =
    member.activeWorkoutSheetId ??
    member.active_workout_sheet_id ??
    member.workoutSheetId ??
    member.workout_sheet_id;

  const names = name.split(" ").filter(Boolean);
  const initials =
    names.length > 1
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : (names[0]?.[0] || "A").toUpperCase();

  return {
    id: String(member.id ?? member.memberId ?? member.member_id ?? `student-${index}`),
    name,
    cpf: rawCpf,
    status,
    hasActiveSheet: Boolean(rawActiveSheetId),
    activeWorkoutSheetId: rawActiveSheetId ? String(rawActiveSheetId) : null,
    initials,
  };
}

function formatCreationDate(raw: unknown): string {
  if (!raw) return "Data não registrada";

  // Caso 1: Array serializado pelo Jackson [year, month, day, hour, minute, second, ...]
  if (Array.isArray(raw) && raw.length >= 3) {
    const year = raw[0];
    const month = String(raw[1]).padStart(2, "0");
    const day = String(raw[2]).padStart(2, "0");
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
  }

  // Caso 2: String ISO ou YYYY-MM-DD (sem conversão de fuso)
  if (typeof raw === "string" && raw.trim()) {
    const trimmed = raw.trim();
    const datePart = trimmed.split(/[T ]/)[0];
    const match = datePart.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, "0");
      const day = match[3].padStart(2, "0");
      return `${day}/${month}/${year}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }
  }

  // Caso 3: Timestamp numérico
  if (typeof raw === "number" && !isNaN(raw) && raw > 0) {
    const d = new Date(raw);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return "Data não registrada";
}

export function mapWorkoutSheet(entry: unknown, index = 0): WorkoutSheetViewModel {
  const sheet: Record<string, unknown> = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
  const rawDate = sheet.createdAt ?? sheet.created_at;
  const formattedDate = formatCreationDate(rawDate);

  const weekDay = readString(sheet.weekDay, readString(sheet.week_day, "MONDAY"));
  const weekDayMap: Record<string, string> = {
    MONDAY: "Segunda-feira",
    TUESDAY: "Terça-feira",
    WEDNESDAY: "Quarta-feira",
    THURSDAY: "Quinta-feira",
    FRIDAY: "Sexta-feira",
    SATURDAY: "Sábado",
    SUNDAY: "Domingo",
  };

  return {
    id: String(sheet.id ?? `sheet-${index}`),
    memberId: String(sheet.memberId ?? sheet.member_id ?? ""),
    title: readString(sheet.title, `Treino ${index + 1}`),
    weekDay,
    weekDayLabel: readString(sheet.weekDayLabel, readString(sheet.week_day_label, weekDayMap[weekDay] || weekDay)),
    active: Boolean(sheet.active ?? sheet.isActive ?? sheet.is_active ?? true),
    version: Number(sheet.version ?? 0),
    createdAtFormatted: formattedDate,
  };
}

export function mapWorkoutExercise(entry: unknown, index = 0): WorkoutExerciseViewModel {
  const exercise: Record<string, unknown> = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};

  return {
    id: String(exercise.id ?? `exercise-${index}`),
    workoutSheetId: String(exercise.workoutSheetId ?? exercise.workout_sheet_id ?? ""),
    exerciseName: readString(exercise.exerciseName, readString(exercise.exercise_name, `Exercício ${index + 1}`)),
    muscle: readString(exercise.muscle, "Geral"),
    exerciseType: readString(exercise.exerciseType, readString(exercise.exercise_type, "Musculação")),
    equipment: readString(exercise.equipment, ""),
    difficulty: readString(exercise.difficulty, ""),
    instructions: readString(exercise.instructions, ""),
    sets: Number(exercise.sets ?? 0),
    reps: Number(exercise.reps ?? 0),
    restSeconds: Number(exercise.restSeconds ?? exercise.rest_seconds ?? 0),
    notes: readString(exercise.notes, ""),
  };
}

export function mapCatalogExercise(entry: unknown, index = 0): CatalogExerciseViewModel {
  const exercise: Record<string, unknown> = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};

  return {
    id: String(exercise.id ?? `cat-${index}`),
    name: readString(exercise.name, `Exercício ${index + 1}`),
    category: readString(exercise.category, "Geral"),
    muscle: readString(exercise.muscle, "Geral"),
    equipment: readString(exercise.equipment, ""),
    instructions: readString(exercise.instructions, ""),
    isCustom: Boolean(exercise.isCustom ?? exercise.is_custom),
    isActive: Boolean(exercise.isActive ?? exercise.is_active ?? true),
  };
}
