"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NavbarLink {
  href: string;
  label: string;
  active?: boolean;
}

export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  logo?: React.ReactNode;
  logoHref?: string;
  navigationLinks?: NavbarLink[];
  signInText?: string;
  signInHref?: string;
  ctaText?: string;
  ctaHref?: string;
  onSignInClick?: () => void;
  onCtaClick?: () => void;
}

const defaultNavigationLinks: NavbarLink[] = [
  { href: "/deposit", label: "Deposit" },
  { href: "/account", label: "Account" },
  { href: "/documentation", label: "Documentation" },
];

export const Logo = () => (
  <Image
    src="/logos/generic-money-black.svg"
    alt="Generic Money"
    width={148}
    height={38}
    priority
    className="h-9 w-auto md:h-10"
  />
);

export const HamburgerIcon = ({
  className,
  ...props
}: React.SVGAttributes<SVGElement>) => (
  <svg
    className={cn("pointer-events-none", className)}
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path
      d="M4 12L20 12"
      className="origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
    />
    <path
      d="M4 12H20"
      className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
    />
    <path
      d="M4 12H20"
      className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
    />
  </svg>
);

export const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
  (
    {
      className,
      logo = <Logo />,
      logoHref = "/",
      navigationLinks = defaultNavigationLinks,
      signInText = "Sign In",
      signInHref = "/signin",
      ctaText = "Get Started",
      ctaHref = "/signup",
      onSignInClick,
      onCtaClick,
      ...props
    },
    ref,
  ) => {
    const [isDesktop, setIsDesktop] = React.useState(false);
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const pathname = usePathname();

    const resolvedLinks = React.useMemo(() => {
      const normalize = (value: string) => {
        if (!value) {
          return "/";
        }
        if (value === "/") {
          return value;
        }
        return value.replace(/\/+$/, "");
      };
      const currentPath = normalize(pathname ?? "/");

      return navigationLinks.map((link) => {
        const normalizedHref = normalize(link.href ?? "/");
        const isActive =
          link.active ??
          (normalizedHref === "/"
            ? currentPath === "/"
            : currentPath.startsWith(normalizedHref));

        return { ...link, active: isActive };
      });
    }, [navigationLinks, pathname]);

    React.useEffect(() => {
      const mediaQuery = window.matchMedia("(min-width: 768px)");
      const update = () => setIsDesktop(mediaQuery.matches);

      update();
      mediaQuery.addEventListener("change", update);

      return () => mediaQuery.removeEventListener("change", update);
    }, []);

    React.useEffect(() => {
      if (isDesktop) {
        setMobileOpen(false);
      }
    }, [isDesktop]);

    const handleSignIn = (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (!onSignInClick) {
        return;
      }
      event.preventDefault();
      onSignInClick();
    };

    const handleCta = (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (!onCtaClick) {
        return;
      }
      event.preventDefault();
      onCtaClick();
    };

    return (
      <header
        ref={ref}
        className={cn(
          "relative sticky top-0 z-50 w-full border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6",
          className,
        )}
        {...props}
      >
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {!isDesktop && (
              <Button
                variant="ghost"
                size="icon"
                className="group h-9 w-9 hover:bg-accent hover:text-accent-foreground"
                aria-label="Toggle navigation"
                aria-expanded={mobileOpen}
                aria-controls="mobile-navigation"
                onClick={() => setMobileOpen((open) => !open)}
              >
                <HamburgerIcon />
              </Button>
            )}
            <Link href={logoHref} className="flex items-center">
              {logo}
            </Link>
          </div>

          {isDesktop && (
            <nav
              aria-label="Primary navigation"
              className="flex items-center gap-1"
            >
              {resolvedLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={cn(
                    "inline-flex h-9 items-center rounded-md px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    link.active
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground/75 hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-3">
            <Link
              href={signInHref}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-sm font-medium",
              )}
              onClick={handleSignIn}
            >
              {signInText}
            </Link>
            <Link
              href={ctaHref}
              className={cn(
                buttonVariants({ size: "sm" }),
                "text-sm font-medium",
              )}
              onClick={handleCta}
            >
              {ctaText}
            </Link>
          </div>
        </div>

        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className={cn(
            "md:hidden",
            "absolute inset-x-0 top-full border-b border-border bg-background/95 shadow-lg transition-all duration-200 ease-out",
            mobileOpen
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-2 opacity-0",
          )}
        >
          <ul className="flex flex-col gap-1 px-4 py-3">
            {resolvedLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    link.active
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground/75",
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
    );
  },
);
Navbar.displayName = "Navbar";
