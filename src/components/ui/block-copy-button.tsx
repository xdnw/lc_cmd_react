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

  React.useEffect(() => {
    setTimeout(() => {
      setHasCopied(false)
    }, 2000)
  }, [hasCopied])

  const handleClick = useCallback(() => {
    navigator.clipboard.writeText(getText())
    setHasCopied(true)
  }, [getText])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className={`h-5 w-5 rounded [&_svg]:size-3 ${left ? "" : ""}`}
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