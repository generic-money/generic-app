export default function AccountPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 pb-24 pt-16 md:px-8 md:pt-20">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        Account Workspace
      </h1>
      <p className="text-base text-muted-foreground">
        Use this page as the foundation for account management. Populate it with
        the components and workflows that make sense for your product.
      </p>
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground">
        Drop in account tables, configuration panels, or contextual help as the
        design evolves.
      </div>
    </main>
  );
}
