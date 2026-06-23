export type Subject = {
  id: string;
  user_id: string;
  code: string | null;
  name: string;
  professor: string | null;
  color: string;
  avg_grade: number | null;
  hours_studied: number;
  attendance_pct: number;
  exam1_grade: number | null;
  exam2_grade: number | null;
  exam3_grade: number | null;
  created_at: string;
};

export type EventKind = "class" | "exam" | "midterm" | "tp" | "study" | "other";

export type AgendaEvent = {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  kind: EventKind;
  starts_at: string;
  ends_at: string | null;
  room: string | null;
  professor: string | null;
  notes: string | null;
  created_at: string;
};

export type Note = {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size_bytes: number | null;
  is_public: boolean;
  downloads: number;
  likes: number;
  has_ai_content: boolean;
  created_at: string;
  // Metadata de Comunidad (se llena al compartir)
  comm_kind: string | null;
  comm_university: string | null;
  comm_career: string | null;
  comm_subject: string | null;
  comm_year: number | null;
  comm_month: number | null;
  // Divisor de PDFs: si está seteado, solo procesar este rango de páginas
  page_from: number | null;
  page_to: number | null;
};

/** Paleta de colores para Materias y eventos */
export const SUBJECT_COLORS = [
  { label: "Ladrillo", value: "#A5402D" },
  { label: "Verde bosque", value: "#4A7C59" },
  { label: "Ámbar terroso", value: "#C47B2B" },
  { label: "Azul pizarra", value: "#4A6B8A" },
  { label: "Coral", value: "#C56450" },
  { label: "Oliva", value: "#7A7A47" },
  { label: "Borgoña", value: "#7E2A3B" },
  { label: "Petróleo", value: "#2F5D6B" },
] as const;
