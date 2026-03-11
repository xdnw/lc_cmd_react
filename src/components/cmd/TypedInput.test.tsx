import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TypedInput from "./TypedInput";

function renderWithQueryClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      {ui}
    </QueryClientProvider>,
  );
}

describe("TypedInput", () => {
  it("inserts zero-arg placeholders from the simple picker", () => {
    const setOutputValue = vi.fn();

    renderWithQueryClient(
      <TypedInput
        argName="value"
        initialValue=""
        placeholder="DBNation"
        type="String"
        setOutputValue={setOutputValue}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /add simple/i }));
    fireEvent.change(screen.getByPlaceholderText(/search placeholder path/i), {
      target: { value: "getscore" },
    });
    fireEvent.click(screen.getByRole("button", { name: /getscore/i }));

    expect((screen.getByPlaceholderText("Expression or token") as HTMLInputElement).value).toBe("{getscore}");
    expect(setOutputValue).toHaveBeenLastCalledWith("value", "{getscore}");
  });

  it("prompts for required args before inserting a placeholder mention", () => {
    const setOutputValue = vi.fn();

    renderWithQueryClient(
      <TypedInput
        argName="value"
        initialValue=""
        placeholder="DBNation"
        type="String"
        setOutputValue={setOutputValue}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /add simple/i }));
    fireEvent.change(screen.getByPlaceholderText(/search placeholder path/i), {
      target: { value: "canbedeclaredonbyscore" },
    });
    fireEvent.click(screen.getByRole("button", { name: /canbedeclaredonbyscore/i }));

    expect(screen.getByRole("heading", { name: /configure canbedeclaredonbyscore/i })).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("double"), {
      target: { value: "1250" },
    });
    fireEvent.click(screen.getByRole("button", { name: /insert placeholder/i }));

    expect((screen.getByPlaceholderText("Expression or token") as HTMLInputElement).value).toBe("{canbedeclaredonbyscore(score: 1250)}");
    expect(setOutputValue).toHaveBeenLastCalledWith("value", "{canbedeclaredonbyscore(score: 1250)}");
  });

  it("searches placeholder descriptions as well as path names", () => {
    renderWithQueryClient(
      <TypedInput
        argName="value"
        initialValue=""
        placeholder="DBNation"
        type="String"
        setOutputValue={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /add simple/i }));
    fireEvent.change(screen.getByPlaceholderText(/search placeholder path/i), {
      target: { value: "nation score" },
    });

    expect(screen.getByRole("button", { name: /getscore/i })).toBeTruthy();
  });

  it("limits the double picker to numeric-return placeholders", () => {
    const setOutputValue = vi.fn();

    renderWithQueryClient(
      <TypedInput
        argName="value"
        initialValue=""
        placeholder="DBNation"
        type="Double"
        setOutputValue={setOutputValue}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /add simple/i }));
    fireEvent.change(screen.getByPlaceholderText(/search placeholder path/i), {
      target: { value: "score" },
    });

    expect(screen.getByRole("button", { name: /getscore/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /getscore/i }));

    expect((screen.getByPlaceholderText("Expression or token") as HTMLInputElement).value).toBe("{getscore}");
    expect(setOutputValue).toHaveBeenLastCalledWith("value", "{getscore}");
  });
});
