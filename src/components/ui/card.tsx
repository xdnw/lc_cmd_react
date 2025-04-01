import * as React from "react"
import { cn } from "@/lib/utils"

const CardComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const classes = React.useMemo(
    () => cn("border bg-card text-card-foreground shadow-xs", className),
    [className]
  )
  return <div ref={ref} className={classes} {...props} />
})
CardComponent.displayName = "Card"
const Card = CardComponent  // removed React.memo for potential first render gains

const CardHeaderComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const classes = React.useMemo(
    () => cn("flex flex-col p-1", className),
    [className]
  )
  return <div ref={ref} className={classes} {...props} />
})
CardHeaderComponent.displayName = "CardHeader"
const CardHeader = CardHeaderComponent

const CardTitleComponent = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  const classes = React.useMemo(
    () => cn("text-lg font-semibold leading-none tracking-tight", className),
    [className]
  )
  return <h3 ref={ref} className={classes} {...props} />
})
CardTitleComponent.displayName = "CardTitle"
const CardTitle = CardTitleComponent

const CardDescriptionComponent = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const classes = React.useMemo(
    () => cn("text-sm text-muted-foreground", className),
    [className]
  )
  return <p ref={ref} className={classes} {...props} />
})
CardDescriptionComponent.displayName = "CardDescription"
const CardDescription = CardDescriptionComponent

const CardContentComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const classes = React.useMemo(
    () => cn("p-6 pt-0", className),
    [className]
  )
  return <div ref={ref} className={classes} {...props} />
})
CardContentComponent.displayName = "CardContent"
const CardContent = CardContentComponent

const CardFooterComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const classes = React.useMemo(
    () => cn("flex items-center p-6 pt-0", className),
    [className]
  )
  return <div ref={ref} className={classes} {...props} />
})
CardFooterComponent.displayName = "CardFooter"
const CardFooter = CardFooterComponent

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }