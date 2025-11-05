export default function DocumentationPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 pb-24 pt-16 md:px-8 md:pt-20">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        Documentation Workspace
      </h1>
      <p className="text-base text-muted-foreground">
        Build out your documentation hub from here. Introduce navigation,
        markdown rendering, or component examples as you define the structure.
      </p>
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground">
        Consider adding quick links, onboarding checklists, or API reference
        sections when you are ready.
      </div>
    </main>
  );
}
