export default function DepositPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 pb-24 pt-16 md:px-8 md:pt-20">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        Deposit Workspace
      </h1>
      <p className="text-base text-muted-foreground">
        Start shaping the deposit experience here. Add sections, components, or
        data visualizations as you define the user journey.
      </p>
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground">
        This area is intentionally sparse—feel free to replace it with forms,
        tables, or summaries that represent your deposit flow.
      </div>
    </main>
  );
}
