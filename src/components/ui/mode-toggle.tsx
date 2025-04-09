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
        <Button variant="outline" size="icon" className="m-0.5 h-7 w-7 rounded-[6px] [&_svg]:size-3.5">
          <LazyIcon name="Sun" className="h-[1rem] w-[1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <LazyIcon name="Moon" className="absolute h-[1rem] w-[1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
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