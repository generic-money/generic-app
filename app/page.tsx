import Link from "next/link";
import { ArrowDown, ArrowUpRight, Coins, Layers, ShieldCheck } from "lucide-react";

import { DepositSidebar } from "./deposit/_components/deposit-sidebar";
import { DepositSwap } from "./deposit/_components/deposit-swap";

export default function HomePage() {
  return (
    <main className="flex flex-col">
      <section className="relative flex min-h-screen w-full items-center pb-24 pt-16 md:pt-20">
        <DepositSwap />
        <DepositSidebar className="pointer-events-auto absolute right-0 top-1/2 hidden -translate-y-1/2 lg:flex" />
        <div className="pointer-events-none absolute inset-x-0 bottom-12 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-background/80 shadow-sm backdrop-blur">
            <ArrowDown className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
      </section>
      <section className="bg-muted/40 px-6 py-16 md:px-8">
        <div className="container mx-auto max-w-6xl space-y-8">
          <header className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Deposit insights
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Track vault utilization, bridge finality, and mint readiness
              before you deploy capital.
            </p>
          </header>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div
              className="group relative min-h-[240px] overflow-hidden rounded-2xl border border-border/60 bg-background/95 p-6 shadow-[0_20px_40px_-35px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_55px_-35px_rgba(15,23,42,0.45)] motion-reduce:transform-none motion-reduce:transition-none animate-in fade-in-0 slide-in-from-bottom-4 duration-700"
              style={{ animationDelay: "40ms" }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,hsl(var(--blue-25)/0.4)_0%,transparent_60%)] opacity-90" />
              <div className="relative flex h-full flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <span className="inline-flex w-fit items-center rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Predeposit
                    </span>
                    <h3 className="text-lg font-semibold">
                      Status Predeposit Vaults
                    </h3>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 text-primary shadow-sm">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Monitor TVL caps, queue depth, and settlement throughput
                  before you commit liquidity.
                </p>
                <div className="mt-auto flex flex-wrap gap-2 text-xs font-semibold text-foreground/80">
                  <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                    TVL cap
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                    Queue depth
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                    Settle rate
                  </span>
                </div>
                <Link
                  href="/documentation"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/70 transition group-hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  aria-label="Read the predeposit vault status guide"
                >
                  View vault status
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div
              className="group relative min-h-[240px] overflow-hidden rounded-2xl border border-border/60 bg-background/95 p-6 shadow-[0_20px_40px_-35px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_55px_-35px_rgba(15,23,42,0.45)] motion-reduce:transform-none motion-reduce:transition-none animate-in fade-in-0 slide-in-from-bottom-4 duration-700"
              style={{ animationDelay: "120ms" }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,hsl(var(--blue-15)/0.35)_0%,transparent_60%)] opacity-90" />
              <div className="relative flex h-full flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <span className="inline-flex w-fit items-center rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Bridge
                    </span>
                    <h3 className="text-lg font-semibold">
                      Citrea L2 bridging
                    </h3>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 text-primary shadow-sm">
                    <Layers className="h-5 w-5" />
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Track L1 to Citrea bridge finality, transfer ETA, and fee
                  estimates for capital routing.
                </p>
                <div className="mt-auto flex flex-wrap gap-2 text-xs font-semibold text-foreground/80">
                  <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                    Bridge finality
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                    Transfer ETA
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                    Fee estimate
                  </span>
                </div>
                <Link
                  href="/documentation"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/70 transition group-hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  aria-label="Read the Citrea bridging guide"
                >
                  Track bridge status
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div
              className="group relative min-h-[240px] overflow-hidden rounded-2xl border border-border/60 bg-background/95 p-6 shadow-[0_20px_40px_-35px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_55px_-35px_rgba(15,23,42,0.45)] motion-reduce:transform-none motion-reduce:transition-none animate-in fade-in-0 slide-in-from-bottom-4 duration-700"
              style={{ animationDelay: "200ms" }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_120%_at_100%_100%,hsl(var(--blue-100)/0.12)_0%,transparent_60%)] opacity-90" />
              <div className="relative flex h-full flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <span className="inline-flex w-fit items-center rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Mint
                    </span>
                    <h3 className="text-lg font-semibold">
                      Minting GUSD on mainnet
                    </h3>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 text-primary shadow-sm">
                    <Coins className="h-5 w-5" />
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Follow collateral readiness, proof availability, and mint
                  windows before issuing GUSD.
                </p>
                <div className="mt-auto flex flex-wrap gap-2 text-xs font-semibold text-foreground/80">
                  <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                    Collateral ready
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                    Proofs live
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                    Mint window
                  </span>
                </div>
                <Link
                  href="/documentation"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/70 transition group-hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  aria-label="Read the GUSD minting guide"
                >
                  Open mint guide
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
