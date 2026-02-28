import * as React from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"
import { Button, ButtonProps } from "./button.tsx"
import LazyIcon from "./LazyIcon.tsx"
import { useCallback } from "react"

export function BlockCopyButton({
  getText,
  left,
  ...props
}: {
  getText: () => string,
  left?: boolean,
} & ButtonProps) {
  const [hasCopied, setHasCopied] = React.useState(false)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    setTimeout(() => {
      setHasCopied(false)
    }, 2000)
  }, [hasCopied])

  const handleClick = useCallback(() => {
    navigator.clipboard.writeText(getText())
    setHasCopied(true)
  }, [getText])

  React.useEffect(() => {
    if (!import.meta.env.DEV) return
    const el = buttonRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width >= window.innerWidth * 0.9 || rect.height >= window.innerHeight * 0.9) {
      console.warn("[BlockCopyButton] Unexpected button size", {
        width: rect.width,
        height: rect.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        className: props.className,
        computedDisplay: getComputedStyle(el).display,
      })
    }
  }, [props.className])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className={`h-5 w-5 rounded [&_svg]:size-3 ${left ? "" : ""}`}
          ref={buttonRef}
          aria-label="Copy"
          onClick={handleClick}
          {...props}
        >
          {hasCopied ? <LazyIcon name="CheckIcon" /> : <LazyIcon name="ClipboardIcon" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Copy code</TooltipContent>
    </Tooltip>
  )
}