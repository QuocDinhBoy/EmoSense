import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-display font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-soft hover:shadow-float btn-press [&_svg]:size-5",
        destructive: "bg-destructive text-destructive-foreground shadow-soft hover:shadow-float btn-press",
        outline: "border-2 border-border bg-card hover:bg-muted text-foreground shadow-soft",
        secondary: "bg-secondary text-secondary-foreground shadow-soft hover:shadow-float btn-press",
        ghost: "hover:bg-muted text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-sunshine text-accent-foreground shadow-float hover:shadow-glow btn-press text-lg [&_svg]:size-6",
        soft: "bg-gradient-sky text-foreground shadow-soft hover:shadow-float btn-press",
        mint: "bg-gradient-mint text-foreground shadow-soft hover:shadow-float btn-press",
        bubble: "bg-gradient-bubble text-foreground shadow-soft hover:shadow-float btn-press",
      },
      size: {
        default: "h-12 px-6 text-base [&_svg]:size-5",
        sm: "h-10 rounded-xl px-4 text-sm",
        lg: "h-16 rounded-3xl px-10 text-lg [&_svg]:size-6",
        xl: "h-20 rounded-3xl px-12 text-xl [&_svg]:size-7",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
