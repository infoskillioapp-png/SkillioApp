import type { SkillioUser } from "@/lib/sync-user";

const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function partOfDay(h: number) {
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export function Greeting({ user }: { user: SkillioUser }) {
  const now = new Date();
  const firstName =
    user.full_name?.split(" ")[0] ?? user.email.split("@")[0];
  const dateStr = `${DAYS[now.getDay()]} ${now.getDate()} de ${MONTHS[now.getMonth()]}`;

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 mb-9">
      <div>
        <div className="eyebrow mb-2">Hoy</div>
        <h1 className="font-display font-extrabold text-4xl sm:text-[44px] tracking-[-0.03em] leading-[1.05]">
          {partOfDay(now.getHours())},{" "}
          <span className="italic text-accent">{firstName}.</span>
        </h1>
        <p className="text-sm text-ink-soft mt-2 capitalize">{dateStr}</p>
      </div>

      <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-accent-soft border border-rule-soft text-accent text-[12.5px] font-semibold">
        🔥 {user.current_streak} {user.current_streak === 1 ? "día" : "días"} seguidos
      </div>
    </header>
  );
}
