import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import CommandsPage from ".";

vi.mock("react-virtuoso", () => ({
  Virtuoso: ({ data, itemContent }: { data: unknown[]; itemContent: (index: number, item: unknown) => React.ReactNode }) => (
    <div>{data.map((item, index) => <div key={index}>{itemContent(index, item)}</div>)}</div>
  ),
}));

vi.mock("@/components/ui/copytoclipboard", () => ({
  default: () => null,
}));

vi.mock("@/utils/Command", () => {
  function createCommand(path: string, description: string) {
    const lowerPath = path.toLowerCase();
    const words = new Set(lowerPath.split(/\s+/).filter(Boolean));
    const charFrequency = [...lowerPath].reduce<Record<string, number>>((frequency, char) => {
      frequency[char] = (frequency[char] ?? 0) + 1;
      return frequency;
    }, {});

    return {
      name: path,
      command: { annotations: {}, viewable: true },
      getPathString: () => path,
      getDescShort: () => description,
      getArguments: () => [],
      getCharFrequency: () => charFrequency,
      getWordFrequency: () => words,
    };
  }

  return {
    CM: {
      getCommands: () => [
        createCommand("alpha", "First command"),
        createCommand("beta", "Second command"),
      ],
    },
  };
});

function renderCommandsPage(initialEntry = "/commands") {
  function LocationSearchProbe() {
    const location = useLocation();
    return <div data-testid="location-search">{location.search}</div>;
  }

  function CommandsShell() {
    return (
      <>
        <LocationSearchProbe />
        <Outlet />
      </>
    );
  }

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<CommandsShell />}>
          <Route path="commands" element={<CommandsPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("CommandsPage", () => {
  it("normalizes parsed state without rewriting the URL on mount", async () => {
    renderCommandsPage("/commands?q=%20alpha%20&roles=%20member%20&unused=1");

    await waitFor(() => {
      expect((screen.getByRole("combobox", { name: /command list search/i }) as HTMLInputElement).value).toBe("alpha");
    });

    expect(screen.getByTestId("location-search").textContent).toBe("?q=%20alpha%20&roles=%20member%20&unused=1");
  });

  it("keeps the search focused while syncing query params", async () => {
    renderCommandsPage();

    const search = screen.getByRole("combobox", { name: /command list search/i }) as HTMLInputElement;
    search.focus();

    fireEvent.change(search, { target: { value: "a" } });

    await waitFor(() => {
      const currentSearch = screen.getByRole("combobox", { name: /command list search/i }) as HTMLInputElement;
      expect(currentSearch.value).toBe("a");
      expect(document.activeElement).toBe(currentSearch);
      expect(screen.getByTestId("location-search").textContent).toBe("?q=a");
    });

    fireEvent.change(document.activeElement as HTMLInputElement, { target: { value: "al" } });

    await waitFor(() => {
      const currentSearch = screen.getByRole("combobox", { name: /command list search/i }) as HTMLInputElement;
      expect(currentSearch.value).toBe("al");
      expect(document.activeElement).toBe(currentSearch);
      expect(screen.getByTestId("location-search").textContent).toBe("?q=al");
    });
  });
});