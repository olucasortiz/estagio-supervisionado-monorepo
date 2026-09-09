import {
  StudentViewModel,
  WorkoutSheetViewModel,
  WorkoutExerciseViewModel,
  CatalogExerciseViewModel,
} from "./types";

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function mapStudent(entry: any, index = 0): StudentViewModel {
  const member = entry && typeof entry === "object" ? entry : {};
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

export function mapWorkoutSheet(entry: any, index = 0): WorkoutSheetViewModel {
  const sheet = entry && typeof entry === "object" ? entry : {};
  const rawDate = readString(sheet.createdAt, readString(sheet.created_at, ""));

  let formattedDate = "—";
  if (rawDate) {
    try {
      const normalized = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;
      const [year, month, day] = normalized.split("-");
      if (year && month && day) {
        formattedDate = `${day}/${month}/${year}`;
      } else {
        formattedDate = rawDate;
      }
    } catch {
      formattedDate = rawDate;
    }
  }

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
    createdAtFormatted: formattedDate,
  };
}

export function mapWorkoutExercise(entry: any, index = 0): WorkoutExerciseViewModel {
  const exercise = entry && typeof entry === "object" ? entry : {};

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

export function mapCatalogExercise(entry: any, index = 0): CatalogExerciseViewModel {
  const exercise = entry && typeof entry === "object" ? entry : {};

  return {
    id: String(exercise.id ?? `cat-${index}`),
    name: readString(exercise.name, `Exercício ${index + 1}`),
    category: readString(exercise.category, "Geral"),
    muscle: readString(exercise.muscle, "Geral"),
    equipment: readString(exercise.equipment, ""),
    instructions: readString(exercise.instructions, ""),
    isCustom: Boolean(exercise.isCustom ?? exercise.is_custom),
  };
}
