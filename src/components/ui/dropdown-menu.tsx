import { cn } from "@/lib/utils";
import React from "react";
import { createPortal } from "react-dom";
import LazyIcon from "./LazyIcon";

// Types
type DropdownMenuContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerElement: HTMLElement | null;
  setTriggerElement: (element: HTMLElement | null) => void;
  contentElement: HTMLElement | null;
  setContentElement: (element: HTMLElement | null) => void;
  registerSubmenu: (id: string, isOpen: boolean) => void;
  unregisterSubmenu: (id: string) => void;
  activeSubmenu: string | null;
};

// Main dropdown context
const DropdownMenuContext = React.createContext<DropdownMenuContextValue | undefined>(undefined);

// Root component
interface DropdownMenuProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const [triggerElement, setTriggerElement] = React.useState<HTMLElement | null>(null);
  const [submenus, setSubmenus] = React.useState<Map<string, boolean>>(new Map());
  const [activeSubmenu, setActiveSubmenu] = React.useState<string | null>(null);
  const [contentElement, setContentElement] = React.useState<HTMLElement | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    if (!isControlled) {
      setUncontrolledOpen(value);
    }
    if (onOpenChange) {
      const newValue = typeof value === "function" ? value(open) : value;
      onOpenChange(newValue);
    }
  }, [isControlled, onOpenChange, open]);

  const registerSubmenu = React.useCallback((id: string, isOpen: boolean) => {
    setSubmenus(prev => {
      const newMap = new Map(prev);
      newMap.set(id, isOpen);
      return newMap;
    });
    if (isOpen) {
      setActiveSubmenu(id);
    } else if (activeSubmenu === id) {
      setActiveSubmenu(null);
    }
  }, [activeSubmenu]);

  const unregisterSubmenu = React.useCallback((id: string) => {
    setSubmenus(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
    if (activeSubmenu === id) {
      setActiveSubmenu(null);
    }
  }, [activeSubmenu]);

  // Close on escape key
  React.useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [open, setOpen]);

  // Close on click outside
  const handleClickOutside = React.useCallback((e: MouseEvent) => {
    const target = e.target as Node;
    // Check if click is outside both trigger and dropdown content
    const clickedOutside =
      (triggerElement && !triggerElement.contains(target)) &&
      (contentElement && !contentElement.contains(target));

    if (clickedOutside) {
      setOpen(false);
    }
  }, [triggerElement, contentElement, setOpen]);

  // Close on click outside
  React.useEffect(() => {
    if (!open) return;

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, handleClickOutside]);

  return (
    <DropdownMenuContext.Provider value={{
      open,
      setOpen,
      triggerElement,
      setTriggerElement,
      contentElement,
      setContentElement,
      registerSubmenu,
      unregisterSubmenu,
      activeSubmenu
    }}>
      {children}
    </DropdownMenuContext.Provider>
  );
};

// Trigger component
type DropdownMenuTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ children, asChild = false, ...props }, forwardedRef) => {
    const context = useDropdownMenuContext();
    const [buttonElement, setButtonElement] = React.useState<HTMLButtonElement | null>(null);

    React.useEffect(() => {
      if (buttonElement) {
        context.setTriggerElement(buttonElement);
      }
    }, [buttonElement, context]);

    const setNode = React.useCallback((node: HTMLButtonElement | null) => {
      setButtonElement(node);
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      }
    }, [forwardedRef]);

    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        context.setOpen(!context.open);
        props.onClick?.(e);
      },
      [context, props]
    );

    // Instead of cloning the child element and injecting the ref (which causes .current access during render),
    // we render a wrapping span that applies the necessary props when asChild is true.
    if (asChild) {
      return (
        <span
          role="button"
          aria-haspopup="menu"
          aria-expanded={context.open}
          ref={setNode as React.Ref<HTMLSpanElement>}
          onClick={handleClick}
          {...props}
        >
          {children}
        </span>
      );
    }

    return (
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={context.open}
        ref={setNode}
        {...props}
        onClick={handleClick}
      >
        {children}
      </button>
    );
  }
);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

// Group component
type DropdownMenuGroupProps = React.HTMLAttributes<HTMLDivElement>;

const DropdownMenuGroup = React.forwardRef<HTMLDivElement, DropdownMenuGroupProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="group"
        className={cn("", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
DropdownMenuGroup.displayName = "DropdownMenuGroup";

// Portal component
interface DropdownMenuPortalProps {
  children: React.ReactNode;
  container?: HTMLElement;
}

const DropdownMenuPortal: React.FC<DropdownMenuPortalProps> = ({
  children,
  container
}) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    children,
    container || document.body
  );
};

// Content component
interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  sideOffset?: number;
  align?: "start" | "center" | "end";
  alignOffset?: number;
  avoidCollisions?: boolean;
}

export function calculateDropdownPosition(
  triggerElement: HTMLElement,
  contentElement: HTMLElement | null,
  {
    sideOffset = 4,
    align = "center",
    alignOffset = 0,
    avoidCollisions = true
  }: {
    sideOffset?: number;
    align?: "start" | "center" | "end";
    alignOffset?: number;
    avoidCollisions?: boolean;
  } = {}
) {
  const triggerRect = triggerElement.getBoundingClientRect();
  const contentRect = contentElement?.getBoundingClientRect() ?? { width: 0, height: 0 };

  // Default position (bottom align-center)
  let top = triggerRect.bottom + sideOffset + window.scrollY;
  let left = triggerRect.left + (triggerRect.width - contentRect.width) / 2 + window.scrollX;

  // Handle alignment
  if (align === "start") left = triggerRect.left + alignOffset + window.scrollX;
  else if (align === "end") left = triggerRect.right - contentRect.width - alignOffset + window.scrollX;

  // Avoid collisions if enabled
  if (avoidCollisions) {
    // Avoid right edge
    if (window.innerWidth - (left + contentRect.width) < 8) {
      left = Math.max(8, left + window.innerWidth - (left + contentRect.width) - 8);
    }

    // Avoid left edge
    if (left < 8) left = 8;

    // Avoid bottom edge
    if (window.innerHeight - (top + contentRect.height) < 8) {
      top = Math.max(8, window.innerHeight - contentRect.height - 8);
    }
  }

  return {
    position: 'absolute' as const,
    top,
    left,
    visibility: 'visible' as const,
    zIndex: 50
  };
}

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({
    children,
    className,
    sideOffset = 4,
    align = "center",
    alignOffset = 0,
    avoidCollisions = true,
    ...props
  }, ref) => {
    const context = useDropdownMenuContext();
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [style, setStyle] = React.useState<React.CSSProperties>({
      position: 'absolute',
      top: -9999,
      left: -9999,
      visibility: 'hidden',
      zIndex: 50
    });

    React.useLayoutEffect(() => {
      if (contentRef.current && context.triggerElement && context.open) {
        const computedStyle = calculateDropdownPosition(
          context.triggerElement,
          contentRef.current,
          { sideOffset, align, alignOffset, avoidCollisions }
        );
        setStyle(computedStyle);
      }
    }, [sideOffset, align, alignOffset, avoidCollisions, context.triggerElement, context.open]);

    React.useEffect(() => {
      if (contentRef.current) {
        context.setContentElement(contentRef.current);
      }
      return () => {
        context.setContentElement(null);
      };
    }, [context]);

    // Forward the ref
    React.useEffect(() => {
      if (ref && contentRef.current) {
        if (typeof ref === 'function') {
          ref(contentRef.current);
        }
      }
    }, [ref]);

    return (
      <DropdownMenuPortal>
        <div
          ref={contentRef}
          role="menu"
          aria-orientation="vertical"
          style={{ ...style, display: context.open ? "block" : "none" }}
          className={cn(
            "min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
            "animate-in fade-in-0 zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2",
            "data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2",
            "data-[side=top]:slide-in-from-bottom-2",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </DropdownMenuPortal>
    );
  }
);
DropdownMenuContent.displayName = "DropdownMenuContent";

// Sub menu
// This requires a separate context
type DropdownMenuSubContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerElement: HTMLElement | null;
  setTriggerElement: (element: HTMLElement | null) => void;
};

const DropdownMenuSubContext = React.createContext<DropdownMenuSubContextValue | undefined>(undefined);

// Helper hook
const useDropdownMenuContext = () => {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error("Dropdown menu components must be used within a DropdownMenu");
  }
  return context;
};

const useDropdownMenuSubContext = () => {
  const context = React.useContext(DropdownMenuSubContext);
  if (!context) {
    throw new Error("Dropdown submenu components must be used within a DropdownMenuSub");
  }
  return context;
};

interface DropdownMenuSubProps {
  children: React.ReactNode;
}

const DropdownMenuSub: React.FC<DropdownMenuSubProps> = ({ children }) => {
  const parentContext = useDropdownMenuContext();
  const [open, setOpen] = React.useState(false);
  const [triggerElement, setTriggerElement] = React.useState<HTMLElement | null>(null);
  const id = React.useId();

  // Register with parent
  React.useEffect(() => {
    parentContext.registerSubmenu(id, open);
    return () => parentContext.unregisterSubmenu(id);
  }, [id, open, parentContext]);

  // Close this submenu when another is opened
  React.useEffect(() => {
    if (parentContext.activeSubmenu && parentContext.activeSubmenu !== id) {
      setOpen(false);
    }
  }, [id, parentContext.activeSubmenu]);

  return (
    <DropdownMenuSubContext.Provider value={{
      open,
      setOpen,
      triggerElement,
      setTriggerElement
    }}>
      {children}
    </DropdownMenuSubContext.Provider>
  );
};

interface DropdownMenuSubTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

const DropdownMenuSubTrigger = React.forwardRef<HTMLDivElement, DropdownMenuSubTriggerProps>(
  ({ className, inset, children, ...props }, ref) => {
    const context = useDropdownMenuSubContext();

    const refCallback = React.useCallback((node: HTMLDivElement | null) => {
      context.setTriggerElement(node);

      if (typeof ref === "function") {
        ref(node);
      }
    }, [context, ref]);

    const handlePointerEnter = React.useCallback(() => {
      context.setOpen(true);
    }, [context]);

    const handlePointerLeave = React.useCallback(() => {
      // Don't close immediately, allow moving to submenu
      setTimeout(() => {
        context.setOpen(false);
      }, 100);
    }, [context]);

    return (
      <div
        ref={refCallback}
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={context.open}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        className={cn(
          "flex cursor-default select-none items-center px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent",
          inset && "pl-8",
          className
        )}
        {...props}
      >
        {children}
        <LazyIcon name="ChevronRight" className="ml-auto h-4 w-4" />
      </div>
    );
  }
);
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

type DropdownMenuSubContentProps = React.HTMLAttributes<HTMLDivElement>;

function updatePositionWithArgs(triggerElement: HTMLElement, contentRef: React.RefObject<HTMLDivElement | null>) {
  const triggerRect = triggerElement.getBoundingClientRect();
  const contentRect = contentRef.current?.getBoundingClientRect() ?? {
    width: 0,
    height: 0
  };

  // Default position (right side)
  let top = triggerRect.top + window.scrollY;
  let left = triggerRect.right + 4 + window.scrollX; // 4px offset

  // Avoid right edge collision
  const rightOverflow = window.innerWidth - (left + contentRect.width);
  if (rightOverflow < 8) {
    // Place on left side instead
    left = triggerRect.left - contentRect.width - 4 + window.scrollX;
  }

  // Avoid bottom edge collision
  const bottomOverflow = window.innerHeight - (top + contentRect.height);
  if (bottomOverflow < 8) {
    top = Math.max(8, window.innerHeight - contentRect.height - 8 + window.scrollY);
  }

  return { top, left };
}

const DropdownMenuSubContent = React.forwardRef<HTMLDivElement, DropdownMenuSubContentProps>(
  ({ className, ...props }, ref) => {
    const parentContext = useDropdownMenuContext();
    const subContext = useDropdownMenuSubContext();
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = React.useState(false);
    const [style, setStyle] = React.useState<React.CSSProperties>({
      position: 'absolute',
      visibility: 'hidden',
      zIndex: 51
    });

    // Forward the ref
    React.useEffect(() => {
      if (ref && contentRef.current) {
        if (typeof ref === 'function') {
          ref(contentRef.current);
        }
      }
    }, [ref]);

    // Handle mounting
    React.useEffect(() => {
      setMounted(subContext.open);
    }, [subContext.open]);

    const updatePosition = React.useCallback(() => {
      if (!mounted || !contentRef.current || !subContext.triggerElement) return;
      updatePositionWithArgs(subContext.triggerElement!, contentRef);
    }, [mounted, subContext.triggerElement]);

    // Position the submenu
    React.useEffect(() => {
      if (!mounted || !contentRef.current || !subContext.triggerElement) return;

      updatePosition();

      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);

      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
      };
    }, [mounted, subContext.triggerElement, updatePosition]);

    // Don't render if parent is closed
    if (!parentContext.open) return null;

    return (
      <div
        ref={contentRef}
        role="menu"
        aria-orientation="vertical"
        style={style}
        className={cn(
          "min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
          "animate-in fade-in-0 zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2",
          "data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2",
          "data-[side=top]:slide-in-from-bottom-2",
          subContext.open ? "opacity-100" : "opacity-0 pointer-events-none",
          "transition-opacity duration-150",
          className
        )}
        {...props}
      />
    );
  }
);
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";

// Radio Group
interface DropdownMenuRadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

const DropdownMenuRadioGroup = React.forwardRef<HTMLDivElement, DropdownMenuRadioGroupProps>(
  ({ className, children, value, onValueChange, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="radiogroup"
        className={cn("", className)}
        data-value={value || ""}
        {...props}
      >
        {React.Children.map(children, child => {
          if (!React.isValidElement(child)) return child;

          // Properly type the element to avoid "child.props is of type unknown" error
          const typedChild = child as React.ReactElement<{
            value: string;
            checked?: boolean;
            onSelect?: () => void;
          }>;

          // Now TypeScript knows what properties are available
          return React.cloneElement(typedChild, {
            checked: typedChild.props.value === value,
            onSelect: () => onValueChange?.(typedChild.props.value)
          });
        })}
      </div>
    );
  }
);
DropdownMenuRadioGroup.displayName = "DropdownMenuRadioGroup";

// Menu Item
interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  disabled?: boolean;
}

const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, inset, disabled, ...props }, ref) => {
    const context = useDropdownMenuContext();

    const handleSelect = React.useCallback(
      (
        e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
      ) => {
        if (disabled) return;
        console.log("DropdownMenuItem selected");
        // Execute the onClick callback first before preventing default
        if (props.onClick) {
          const result = props.onClick(e as React.MouseEvent<HTMLDivElement>);
          // Allow the callback to complete before closing menu
          Promise.resolve(result).then(() => {
            context.setOpen(false);
          });
        } else {
          context.setOpen(false);
        }
        e.preventDefault();
      },
      [context, disabled, props]
    );

    return (
      <div
        ref={ref}
        role="menuitem"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        className={cn(
          "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground",
          inset && "pl-8",
          disabled && "pointer-events-none opacity-50",
          className
        )}
        {...props}
        onClick={handleSelect}
        onKeyDown={handleSelect}
      />
    );
  }
);
DropdownMenuItem.displayName = "DropdownMenuItem";

// Checkbox Item
interface DropdownMenuCheckboxItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'checked' | 'onCheckedChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

const DropdownMenuCheckboxItem = React.forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(
  ({ className, children, checked, onCheckedChange, disabled, ...props }, ref) => {
    const context = useDropdownMenuContext();

    const handleSelect = React.useCallback(
      (
        e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
      ) => {
        if (disabled) return;
        e.preventDefault();
        onCheckedChange?.(!checked);
        props.onClick?.(e as React.MouseEvent<HTMLDivElement>);
      },
      [checked, disabled, onCheckedChange, props]
    );

    return (
      <div
        ref={ref}
        role="menuitemcheckbox"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        className={cn(
          "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-xs outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground",
          disabled && "pointer-events-none opacity-50",
          className
        )}
        {...props}
        onClick={handleSelect}
        onKeyDown={handleSelect}
      >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          {checked && <LazyIcon name="Check" className="h-4 w-4" />}
        </span>
        {children}
      </div>
    );
  }
);
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

// Radio Item
interface DropdownMenuRadioItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  checked?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}

const DropdownMenuRadioItem = React.forwardRef<HTMLDivElement, DropdownMenuRadioItemProps>(
  ({ className, children, value, checked, onSelect, disabled, ...props }, ref) => {
    // Note: checked and onSelect are passed by RadioGroup
    const context = useDropdownMenuContext();

    const handleSelect = React.useCallback(
      (
        e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
      ) => {
        if (disabled) return;
        e.preventDefault();
        onSelect?.();
        props.onClick?.(e as React.MouseEvent<HTMLDivElement>);
      },
      [disabled, onSelect, props]
    );

    return (
      <div
        ref={ref}
        role="menuitemradio"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        data-value={value}
        className={cn(
          "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-xs outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground",
          disabled && "pointer-events-none opacity-50",
          className
        )}
        {...props}
        onClick={handleSelect}
        onKeyDown={handleSelect}
      >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          {checked && <LazyIcon name="Circle" className="h-2 w-2 fill-current" />}
        </span>
        {children}
      </div>
    );
  }
);
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

// Label
interface DropdownMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, DropdownMenuLabelProps>(
  ({ className, inset, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "px-2 py-1.5 text-xs font-semibold",
          inset && "pl-8",
          className
        )}
        {...props}
      />
    );
  }
);
DropdownMenuLabel.displayName = "DropdownMenuLabel";

// Separator
type DropdownMenuSeparatorProps = React.HTMLAttributes<HTMLDivElement>;

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="separator"
        className={cn("-mx-1 my-1 h-px bg-muted", className)}
        {...props}
      />
    );
  }
);
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

// Shortcut
type DropdownMenuShortcutProps = React.HTMLAttributes<HTMLSpanElement>;

const DropdownMenuShortcut: React.FC<DropdownMenuShortcutProps> = ({
  className,
  ...props
}) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};