"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type DepositSidebarProps = {
  className?: string;
};

export function DepositSidebar({ className }: DepositSidebarProps = {}) {
  const [open, setOpen] = useState(false);

  return (
    <aside
      className={cn(
        "relative z-50 flex h-[520px] overflow-hidden rounded-l-3xl rounded-r-none border border-border/60 bg-background transition-[width] duration-300 ease-out",
        open ? "w-72" : "w-12",
        className,
      )}
    >
      {open ? (
        <div className="flex h-full w-full flex-col">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              aria-label="Collapse sidebar"
              aria-expanded={open}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background shadow-sm transition hover:bg-muted/40"
              onClick={() => setOpen(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Live feed
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-4 px-4 py-6">
            <div className="h-16 rounded-xl border border-border/60 bg-muted/40" />
            <div className="h-16 rounded-xl border border-border/60 bg-muted/40" />
            <div className="flex-1 rounded-2xl border border-border/60 bg-muted/40" />
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full flex-col items-center gap-3 px-2 py-4">
          <button
            type="button"
            aria-label="Expand sidebar"
            aria-expanded={open}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background shadow-sm transition hover:bg-muted/40"
            onClick={() => setOpen(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex-1" />
        </div>
      )}
    </aside>
  );
}
