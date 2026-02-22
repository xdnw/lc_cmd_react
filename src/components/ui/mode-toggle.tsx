import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Theme, useTheme } from "@/components/ui/theme-provider"
import { Button } from "@/components/ui/button.tsx";
import LazyIcon from "./LazyIcon";
import { useCallback } from "react";

export function ModeToggle() {
  const { setTheme } = useTheme()

  // Add a direct function that verifies setTheme works
  const handleThemeChange = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const theme = e.currentTarget.getAttribute("data-key") as Theme;
    console.log(`Setting theme to: ${theme}`);
    try {
      setTheme(theme);
      console.log(`Theme set to: ${theme}`);
      return new Promise<void>(resolve => {
        // Give the theme time to apply
        setTimeout(() => resolve(), 100);
      });
    } catch (error) {
      console.error("Error setting theme:", error);
    }
  }, [setTheme])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="iconSm" className="rounded-md [&_svg]:size-3.5 text-muted-foreground hover:text-foreground">
          <LazyIcon name="Sun" className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <LazyIcon name="Moon" className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem data-key="light" onClick={handleThemeChange}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem data-key="dark" onClick={handleThemeChange}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem data-key="system" onClick={handleThemeChange}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}