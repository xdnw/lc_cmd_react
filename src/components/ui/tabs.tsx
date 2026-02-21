"use client"

import * as React from "react"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useId,
  startTransition,
  useLayoutEffect
} from "react"
import { cn } from "@/lib/utils"

// Split context for more granular updates
const TabsValueContext = createContext<{
  value: string
  tabsId: string
  isInitialRender: boolean
  preloadStrategy: 'none' | 'active' | 'adjacent' | 'all'
}>({
  value: "",
  tabsId: "",
  isInitialRender: true,
  preloadStrategy: 'active'
})

const TabsActionContext = createContext<{
  onChange: (value: string) => void
}>({
  onChange: () => { }
})

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  preloadStrategy?: 'none' | 'active' | 'adjacent' | 'all'
}

// Root tabs component
const Tabs = React.memo(({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
  preloadStrategy = 'active',
  ...props
}: TabsProps) => {
  const tabsId = useId()
  // Track initial render with state, not a ref
  const [isInitialRender, setIsInitialRender] = useState(true)

  // Controlled or uncontrolled state management
  const [internalValue, setInternalValue] = useState(defaultValue || "")
  const currentValue = value !== undefined ? value : internalValue

  const handleValueChange = useCallback((newValue: string) => {
    // Use startTransition for state updates to keep UI responsive
    startTransition(() => {
      if (value === undefined) {
        setInternalValue(newValue)
      }
      onValueChange?.(newValue)
    })
  }, [value, onValueChange])

  // Split context values for more targeted renders
  const valueContextValue = useMemo(() => ({
    value: currentValue,
    tabsId,
    isInitialRender,
    preloadStrategy
  }), [currentValue, tabsId, isInitialRender, preloadStrategy])

  const actionContextValue = useMemo(() => ({
    onChange: handleValueChange
  }), [handleValueChange])

  // After first render, update state
  useLayoutEffect(() => {
    setIsInitialRender(false)
  }, [])

  return (
    <TabsValueContext.Provider value={valueContextValue}>
      <TabsActionContext.Provider value={actionContextValue}>
        <div
          data-preload-strategy={preloadStrategy}
          className={cn("w-full", className)}
          {...props}
        >
          {children}
        </div>
      </TabsActionContext.Provider>
    </TabsValueContext.Provider>
  )
})
Tabs.displayName = "Tabs"

// Custom hooks for consuming context
const useTabsValue = () => useContext(TabsValueContext)
const useTabsAction = () => useContext(TabsActionContext)

// Pre-compute styles objects outside component for performance
const tabsListStyles = {
  base: "inline-flex min-h-9 items-center justify-center rounded-md bg-muted p-0.5 text-muted-foreground",
  dark: ""
}

const TabsList = React.memo(React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const memoizedClassName = useMemo(() =>
    cn(tabsListStyles.base, tabsListStyles.dark, className),
    [className]
  )

  return (
    <div
      ref={ref}
      role="tablist"
      className={memoizedClassName}
      {...props}
    />
  )
}))
TabsList.displayName = "TabsList"

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

// Precomputed styles for triggers
const triggerStyles = {
  base: "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  active: "bg-background text-foreground shadow-sm",
  inactive: "text-muted-foreground hover:bg-accent",
  dark: ""
}

// Tab trigger component
const TabsTrigger = React.memo(React.forwardRef<
  HTMLButtonElement,
  TabsTriggerProps
>(({ className, value, children, ...props }, ref) => {
  const { value: selectedValue, tabsId } = useTabsValue()
  const { onChange } = useTabsAction()
  const isSelected = selectedValue === value

  const handleClick = useCallback(() => {
    onChange(value)
  }, [onChange, value])

  // Avoid recalculating class names on every render
  const memoizedClassName = useMemo(() =>
    cn(
      triggerStyles.base,
      isSelected ? triggerStyles.active : triggerStyles.inactive,
      triggerStyles.dark,
      className
    ),
    [className, isSelected]
  )

  const contentId = `${tabsId}-content-${value}`
  const triggerId = `${tabsId}-trigger-${value}`

  return (
    <button
      ref={ref}
      role="tab"
      type="button"
      id={triggerId}
      aria-selected={isSelected}
      aria-controls={contentId}
      tabIndex={isSelected ? 0 : -1}
      data-state={isSelected ? "active" : "inactive"}
      onClick={handleClick}
      className={memoizedClassName}
      {...props}
    >
      {children}
    </button>
  )
}), (prevProps, nextProps) => {
  // Custom equality comparison for more aggressive memoization
  const { value: prevValue, className: prevClassName, ...prevRest } = prevProps
  const { value: nextValue, className: nextClassName, ...nextRest } = nextProps

  // Only re-render if these specific props change
  return (
    prevValue === nextValue &&
    prevClassName === nextClassName &&
    prevProps.children === nextProps.children &&
    Object.keys(prevRest).length === Object.keys(nextRest).length
  )
})
TabsTrigger.displayName = "TabsTrigger"

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  forceMount?: boolean
  // Add prop for adjacent index to optimize adjacent loading
  index?: number
}

// Precomputed styles for content
const contentStyles = {
  base: "mt-1 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  dark: "dark:focus-visible:ring-slate-500"
}

// Tab content component with intelligent loading
const TabsContent = React.memo(React.forwardRef<
  HTMLDivElement,
  TabsContentProps
>(({ className, value, forceMount, index, children, ...props }, ref) => {
  const { value: selectedValue, tabsId, isInitialRender, preloadStrategy } = useTabsValue()
  const isSelected = selectedValue === value

  // Calculate all values using hooks before any conditional returns
  const shouldRender = useMemo(() => {
    if (forceMount) return true
    if (isSelected) return true

    // On first render, be conservative with what we render
    if (isInitialRender) {
      if (preloadStrategy === 'none') return false
      if (preloadStrategy === 'active') return isSelected
      if (preloadStrategy === 'adjacent') {
        // If index is provided, can determine if adjacent to selected tab
        return isSelected || (index !== undefined &&
          (selectedValue === `tab-${index - 1}` || selectedValue === `tab-${index + 1}`))
      }
      if (preloadStrategy === 'all') return true

      // Default to only rendering selected tab on first render
      return isSelected
    }

    return false
  }, [forceMount, isSelected, isInitialRender, preloadStrategy, index, selectedValue])

  const memoizedClassName = useMemo(() =>
    cn(
      contentStyles.base,
      contentStyles.dark,
      !isSelected && forceMount && "hidden",
      className
    ),
    [className, isSelected, forceMount]
  )

  const contentId = `${tabsId}-content-${value}`
  const triggerId = `${tabsId}-trigger-${value}`

  // Instead of early return, conditionally render the content
  return (
    shouldRender ? (
      <div
        ref={ref}
        role="tabpanel"
        id={contentId}
        aria-labelledby={triggerId}
        tabIndex={0}
        hidden={!isSelected}
        data-state={isSelected ? "active" : "inactive"}
        className={memoizedClassName}
        {...props}
      >
        {children}
      </div>
    ) : null
  )
}))
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }