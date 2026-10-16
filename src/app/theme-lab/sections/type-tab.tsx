import { Section } from "./section";

export function TypeTab() {
  return (
    <>
      <Section title="Fonts" note="Chakra Petch for headings, prices and labels (techy, squared). Inter for body text (readable).">
        <div className="rounded-2xl border bg-card p-6">
          <p className="font-display text-5xl font-bold tracking-tight">Level up <span className="text-gradient">for less</span></p>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Instant digital delivery, wallet top-ups and gift codes. Body copy sits in Inter so long
            descriptions stay easy on the eyes.
          </p>
        </div>
      </Section>
      <Section title="Scale">
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          {[
            ["Display", "font-display text-4xl font-bold"],
            ["Heading 1", "font-display text-3xl font-bold"],
            ["Heading 2", "font-display text-2xl font-semibold"],
            ["Heading 3", "font-display text-lg font-semibold"],
            ["Body", "text-base"],
            ["Small / meta", "text-sm text-muted-foreground"],
            ["Label", "text-xs font-semibold uppercase tracking-widest text-highlight"],
            ["Price", "text-gradient font-display text-3xl font-bold"],
          ].map(([label, cls]) => (
            <div key={label} className="flex items-baseline gap-6 border-b pb-3 last:border-0 last:pb-0">
              <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
              <span className={cls}>Cheap Seller Store 1234</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
