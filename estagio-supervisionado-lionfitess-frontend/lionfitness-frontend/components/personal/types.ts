export type StudentStatus = "Ativo" | "Inativo";

export interface StudentViewModel {
  id: string;
  memberId?: string;
  name: string;
  cpf: string;
  status: StudentStatus;
  hasActiveSheet: boolean;
  activeWorkoutSheetId: string | null;
  initials: string;
}

export interface WorkoutSheetViewModel {
  id: string;
  memberId: string;
  title: string;
  weekDay: string;
  weekDayLabel: string;
  active: boolean;
  version: number;
  createdAtFormatted: string;
  exerciseCount?: number;
}

export interface WorkoutExerciseViewModel {
  id: string;
  workoutSheetId: string;
  exerciseName: string;
  muscle: string;
  exerciseType: string;
  equipment: string;
  difficulty?: string;
  instructions: string;
  sets: number;
  reps: number;
  restSeconds: number;
  notes: string;
  catalogExerciseId?: string;
}

export interface WorkoutSheetUpdateData {
  title: string;
  weekDay: string;
  version: number;
  changeReason: string;
  exercises: {
    id?: string;
    catalogExerciseId?: string;
    sets: number;
    reps: number;
    restSeconds: number;
    instructions: string;
    notes: string;
  }[];
}

export interface CatalogExerciseViewModel {
  id: string;
  name: string;
  category: string;
  muscle: string;
  equipment: string;
  instructions: string;
  isCustom: boolean;
  isActive: boolean;
}

export interface NewSheetFormData {
  title: string;
  weekDay: string;
}

export interface PrescriptionFormData {
  workoutSheetId: string;
  sets: number;
  reps: number;
  restSeconds: number;
  notes: string;
}

export interface CustomExerciseFormData {
  name: string;
  category: string;
  muscle: string;
  equipment: string;
  instructions: string;
}
