import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-display font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-muted active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:scale-[0.98]",
        ghost: 
          "text-foreground hover:bg-muted active:scale-[0.98]",
        link: 
          "text-primary underline-offset-4 hover:underline",
        // STRYK Custom Variants
        hero:
          "bg-primary text-primary-foreground shadow-blue hover:shadow-lg hover:bg-primary/90 active:scale-[0.98]",
        heroOutline:
          "border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-primary-foreground active:scale-[0.98]",
        dark:
          "bg-stryk-black text-primary-foreground shadow-sm hover:bg-stryk-graphite active:scale-[0.98]",
        gold:
          "bg-stryk-gold text-stryk-navy font-semibold shadow-lg hover:bg-stryk-goldLight active:scale-[0.98]",
        success:
          "bg-success text-success-foreground shadow-sm hover:bg-success/90 active:scale-[0.98]",
        attendance:
          "bg-success text-success-foreground shadow-sm hover:bg-success/90 active:scale-[0.98] min-h-[56px]",
        absent:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98] min-h-[56px]",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm rounded-md",
        sm: "h-8 px-3 text-xs rounded-md",
        lg: "h-12 px-6 text-base rounded-md",
        xl: "h-14 px-8 text-lg rounded-md",
        icon: "h-10 w-10 rounded-md",
        iconSm: "h-8 w-8 rounded-md",
        iconLg: "h-12 w-12 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
