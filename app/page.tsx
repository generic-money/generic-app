import {
  ArrowDown,
  ArrowUpRight,
  BadgeCheck,
  Coins,
  Layers,
  LineChart,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { OPPORTUNITY_APY_CAP } from "@/lib/constants/opportunity-theme";
import { DepositSidebar } from "./deposit/_components/deposit-sidebar";
import { DepositSwap } from "./deposit/_components/deposit-swap";

const TRUST_ITEMS = [
  {
    title: "Audit by Cantina",
    description: "Read the report",
    href: "https://www.generic.money/whitepaper.pdf",
    icon: ShieldCheck,
  },
  {
    title: "Risk by Steakhouse",
    description: "DeFi-native risk management",
    icon: BadgeCheck,
  },
  {
    title: "Proof of Reserves",
    description: "Live transparency",
    href: "https://generic-analytics.vercel.app/",
    icon: LineChart,
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-col">
      <section className="relative flex min-h-screen w-full items-center pb-24 pt-16 md:pt-20">
        <DepositSwap />
        <DepositSidebar className="pointer-events-auto absolute right-0 top-1/2 hidden -translate-y-1/2 lg:flex" />
        <div className="absolute inset-x-0 bottom-12 flex justify-center">
          <a
            href="#protocol-insights"
            aria-label="Scroll to protocol insights"
            className="group flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-background/80 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowDown className="h-6 w-6 text-muted-foreground transition group-hover:text-foreground" />
          </a>
        </div>
      </section>
      <section
        id="protocol-insights"
        className="bg-muted/40 px-6 py-16 md:px-8"
      >
        <div className="container mx-auto max-w-6xl space-y-8">
          <header className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Protocol insights
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Track liquidity, launch readiness, and mint status before you
              deploy capital.
            </p>
          </header>
          <div className="grid gap-4 md:grid-cols-2">
            <div
              className="group relative min-h-[240px] overflow-hidden rounded-2xl border border-border/60 bg-background/95 p-6 shadow-[0_20px_40px_-35px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_55px_-35px_rgba(15,23,42,0.45)] motion-reduce:transform-none motion-reduce:transition-none animate-in fade-in-0 slide-in-from-bottom-4 duration-700"
              style={{ animationDelay: "40ms" }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,hsl(var(--accent)/0.45)_0%,transparent_60%)] opacity-90" />
              <div className="relative flex h-full flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <span className="inline-flex w-fit items-center rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status GUSD
                    </span>
                    <h3 className="text-lg font-semibold">
                      Status L2 predeposit vault
                    </h3>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 text-primary shadow-sm">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Early access to a privacy-forward Status L2 vault. Lock now,
                  unlock at launch — no penalties
                </p>
                <div className="mt-auto space-y-3">
                  <div className="grid gap-3">
                    <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
                      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                        Up to
                      </p>
                      <p className="mt-1 text-lg font-bold text-foreground">
                        {OPPORTUNITY_APY_CAP.predeposit} APY
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <a
                      href="https://x.com/genericmoney"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-foreground/70 transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      Announcement
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                    <Link
                      href="/documentation"
                      className="inline-flex items-center gap-2 text-sm font-medium text-foreground/70 transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      aria-label="Open strategies"
                    >
                      Strategies
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="group relative min-h-[240px] overflow-hidden rounded-2xl border border-border/60 bg-background/95 p-6 shadow-[0_20px_40px_-35px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_55px_-35px_rgba(15,23,42,0.45)] motion-reduce:transform-none motion-reduce:transition-none animate-in fade-in-0 slide-in-from-bottom-4 duration-700"
              style={{ animationDelay: "120ms" }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,hsl(var(--accent)/0.35)_0%,transparent_60%)] opacity-90" />
              <div className="relative flex h-full flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <span className="inline-flex w-fit items-center rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Citrea staking
                    </span>
                    <h3 className="text-lg font-semibold">
                      sGUSD vault on Citrea
                    </h3>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 text-primary shadow-sm">
                    <Layers className="h-5 w-5" />
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Stake Citrea GUSD into the vault to mint sGUSD and earn yield
                  on Bitcoin DeFi liquidity
                </p>
                <div className="mt-auto space-y-3">
                  <div className="grid gap-3">
                    <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
                      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                        Up to
                      </p>
                      <p className="mt-1 text-lg font-bold text-foreground">
                        {OPPORTUNITY_APY_CAP.citrea} APY
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <a
                      href="https://x.com/genericmoney"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-foreground/70 transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      Announcement
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                    <Link
                      href="/documentation"
                      className="inline-flex items-center gap-2 text-sm font-medium text-foreground/70 transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      aria-label="Open strategies"
                    >
                      Strategies
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="hidden group relative min-h-[240px] overflow-hidden rounded-2xl border border-border/60 bg-background/95 p-6 shadow-[0_20px_40px_-35px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_55px_-35px_rgba(15,23,42,0.45)] motion-reduce:transform-none motion-reduce:transition-none animate-in fade-in-0 slide-in-from-bottom-4 duration-700"
              style={{ animationDelay: "200ms" }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_120%_at_100%_100%,hsl(var(--primary)/0.12)_0%,transparent_60%)] opacity-90" />
              <div className="relative flex h-full flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <span className="inline-flex w-fit items-center rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Mainnet GUSD
                    </span>
                    <h3 className="text-lg font-semibold">
                      Mainnet GUSD for payments
                    </h3>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 text-primary shadow-sm">
                    <Coins className="h-5 w-5" />
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Simple payments stablecoin with up to 5% APY. No hustle, no
                  extra steps
                </p>
                <div className="mt-auto space-y-3">
                  <div className="grid gap-3">
                    <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
                      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                        Up to
                      </p>
                      <p className="mt-1 text-lg font-bold text-foreground">
                        {OPPORTUNITY_APY_CAP.mainnet} APY
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <a
                      href="https://x.com/genericmoney"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-foreground/70 transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      Announcement
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                    <Link
                      href="/documentation"
                      className="inline-flex items-center gap-2 text-sm font-medium text-foreground/70 transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      aria-label="Open strategies"
                    >
                      Strategies
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Trust & transparency
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {TRUST_ITEMS.map((item) => {
                const Icon = item.icon;
                const content = (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/80 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    {item.href ? (
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    ) : null}
                  </>
                );

                const className =
                  "flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-xs transition hover:border-primary/30 hover:bg-background";

                return item.href ? (
                  <a
                    key={item.title}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                  >
                    {content}
                  </a>
                ) : (
                  <div key={item.title} className={className}>
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
