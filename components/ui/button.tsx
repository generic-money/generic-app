import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "ghost" | "outline";
type ButtonSize = "default" | "sm" | "icon";

const baseClasses =
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-primary",
  ghost:
    "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-primary",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-primary",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3",
  icon: "h-9 w-9",
};

export function buttonVariants(
  options: { variant?: ButtonVariant; size?: ButtonSize } = {},
) {
  const { variant = "default", size = "default" } = options;
  return cn(baseClasses, variantClasses[variant], sizeClasses[size]);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "default", type, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
