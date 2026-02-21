import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "ui-button inline-flex max-w-full min-w-0 items-center justify-center gap-1.5 whitespace-nowrap overflow-hidden text-xs font-medium select-none rounded-md no-underline ring-offset-background transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.98] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 disabled:active:translate-y-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/78",
        destructive:
          "border border-destructive/35 bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/92 active:bg-destructive/80 dark:border-destructive/55 dark:hover:bg-destructive/88 dark:active:bg-destructive/76",
        outline:
          "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 active:bg-secondary/70",
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
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
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const classes = React.useMemo(
      () => cn(buttonVariants({ variant, size, className })),
      [className, variant, size]
    )

    const Comp = asChild ? Slot : "button"
    return <Comp className={classes} ref={ref} {...props} />
  }
)
Button.displayName = "button"

export { Button, buttonVariants }