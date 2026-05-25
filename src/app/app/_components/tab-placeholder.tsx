type Props = {
  eyebrow: string;
  title: string;
  description: string;
  phase: string;
};

export function TabPlaceholder({ eyebrow, title, description, phase }: Props) {
  return (
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto">
      <div className="eyebrow mb-2">{eyebrow}</div>
      <h1 className="font-display font-extrabold text-4xl tracking-[-0.03em] mb-3">
        {title}
      </h1>
      <p className="text-ink-soft text-sm max-w-xl mb-10">{description}</p>

      <div className="rounded-3xl bg-paper border border-rule-soft p-12 text-center">
        <div className="text-5xl mb-3 opacity-60">🚧</div>
        <h2 className="font-display font-bold text-xl mb-1">En construcción</h2>
        <p className="text-sm text-ink-soft">
          Lo cocinamos en <strong className="text-accent">{phase}</strong>.
        </p>
      </div>
    </div>
  );
}
