import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group isolate relative inline-flex max-w-full min-w-0 items-center justify-center gap-1.5 whitespace-nowrap overflow-hidden text-xs font-medium select-none rounded-md ring-offset-background transition-[color] duration-150 active:brightness-90 before:content-[''] before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:transition-[background-color,border-color,inset] before:duration-150 active:before:inset-[1px_1px_0px_1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "text-primary-foreground shadow-sm before:bg-primary hover:before:bg-primary/90 active:before:bg-primary/78",
        destructive:
          "text-destructive-foreground shadow-sm before:border before:border-destructive/35 before:bg-destructive hover:before:bg-destructive/92 active:before:bg-destructive/80 dark:before:border-destructive/55 dark:hover:before:bg-destructive/88 dark:active:before:bg-destructive/76",
        outline:
          "shadow-xs hover:text-accent-foreground before:border before:border-input before:bg-background hover:before:bg-accent active:before:bg-accent/80",
        secondary:
          "text-secondary-foreground shadow-xs before:bg-secondary hover:before:bg-secondary/80 active:before:bg-secondary/70",
        ghost:
          "hover:text-accent-foreground hover:before:bg-accent active:before:bg-accent/80",
        link: "text-primary underline-offset-4 hover:underline active:text-primary/80",
      },
      size: {
        default: "h-7 px-3 py-1",
        sm: "h-6 rounded-md px-2",
        md: "h-7 rounded-md px-3",
        lg: "h-8 rounded-md px-5",
        touch: "h-10 px-4",
        icon: "h-7 w-7",
        iconSm: "h-6 w-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const classes = React.useMemo(
      () => cn(buttonVariants({ variant, size }), className, "relative ui-button"),
      [className, variant, size]
    )

    const Comp = asChild ? Slot : "button"
    return (
      <Comp className={classes} ref={ref} {...props}>
        {asChild ? (
          children
        ) : (
          <span className="relative z-1 inline-flex items-center justify-center gap-1.5 transition-transform duration-150 origin-bottom group-active:scale-[0.96]">
            {children}
          </span>
        )}
      </Comp>
    )
  }
)
Button.displayName = "button"

export { Button, buttonVariants }