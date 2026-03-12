import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../ui/input-otp", async () => {
  const React = await import("react");

  const InputOTP = ({ children, value, onChange, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { value?: string; onChange?: (value: string) => void; children: React.ReactNode }) => {
    const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(event.currentTarget.value);
    }, [onChange]);

    return (
      <div>
        <input
          {...props}
          value={value ?? ""}
          onChange={handleChange}
        />
        {children}
      </div>
    );
  };

  return {
    InputOTP,
    InputOTPGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    InputOTPSlot: ({ index }: { index: number }) => <div data-testid={`slot-${index}`} />,
  };
});

import MmrInput from "./MmrInput";

describe("MmrInput", () => {
  const noopSetOutputValue = vi.fn();

  it("uses numeric input mode for digit-only MMR inputs and only commits complete values", () => {
    const setOutputValue = vi.fn();

    render(
      <MmrInput
        argName="mmr"
        allowWildcard={false}
        initialValue=""
        setOutputValue={setOutputValue}
      />,
    );

    const input = screen.getByRole("textbox", { name: "mmr" }) as HTMLInputElement;
    expect(input.getAttribute("inputmode")).toBe("numeric");

    fireEvent.change(input, { target: { value: "123" } });
    expect(setOutputValue).toHaveBeenLastCalledWith("mmr", "");

    fireEvent.change(input, { target: { value: "1234" } });
    expect(setOutputValue).toHaveBeenLastCalledWith("mmr", "1234");
  });

  it("uses text input mode when wildcard letters are allowed", () => {
    render(
      <MmrInput
        argName="matcher"
        allowWildcard={true}
        initialValue=""
        setOutputValue={noopSetOutputValue}
      />,
    );

    const input = screen.getByRole("textbox", { name: "matcher" });
    expect(input.getAttribute("inputmode")).toBe("text");
  });
});