import { ArrowDown } from "lucide-react";

import { DepositSidebar } from "./_components/deposit-sidebar";

export default function DepositPage() {
  return (
    <main className="flex flex-col">
      <section className="relative flex min-h-screen w-full items-center pb-24 pt-16 md:pt-20">
        <div className="w-full px-6 md:px-8">
          <div className="mx-auto flex w-full max-w-4xl justify-center">
            <div className="flex w-full max-w-md flex-col gap-6 rounded-3xl border border-border/60 bg-card/60 p-8 shadow-[0_35px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                <span>Deposit</span>
                <span>Vault</span>
              </div>
              <div className="space-y-4 rounded-2xl border border-border/80 bg-background/70 p-5">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>From</span>
                  <span className="font-medium text-foreground">Token</span>
                </div>
                <div className="h-12 rounded-xl bg-muted/40" />
              </div>
              <div className="space-y-4 rounded-2xl border border-border/80 bg-background/70 p-5">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>To</span>
                  <span className="font-medium text-foreground">Vault share</span>
                </div>
                <div className="h-12 rounded-xl bg-muted/40" />
              </div>
              <div className="h-11 rounded-xl bg-gradient-to-r from-primary via-primary/90 to-primary/95" />
            </div>
          </div>
        </div>
        <DepositSidebar className="pointer-events-auto absolute right-0 top-1/2 hidden -translate-y-1/2 lg:flex" />
        <div className="pointer-events-none absolute inset-x-0 bottom-12 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-background/80 shadow-sm backdrop-blur">
            <ArrowDown className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
      </section>
      <section className="bg-muted/40 px-6 py-16 md:px-8">
        <div className="container mx-auto max-w-6xl space-y-8">
          <header className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Deposit insights
            </h2>
          </header>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="min-h-[140px] rounded-2xl border border-border/60 bg-background" />
            <div className="min-h-[140px] rounded-2xl border border-border/60 bg-background" />
            <div className="min-h-[140px] rounded-2xl border border-border/60 bg-background" />
          </div>
        </div>
      </section>
    </main>
  );
}
