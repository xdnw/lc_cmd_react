import * as React from "react"

import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>; 

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const isBooleanControl = type === "checkbox" || type === "radio";
    const baseClass = isBooleanControl
      ? "relative h-4 w-4 border bg-background border-input"
      : "relative block h-9 w-full border bg-background border-input px-2";

    return (
      <input
        type={type}
        className={cn(
          baseClass,
          "text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
