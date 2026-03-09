import { describe, expect, it } from "vitest";

import { parseMapString, parseMapStringDetailed } from "@/utils/MapParser";
import { CM, getTypeBreakdown } from "@/utils/Command";
import { resolveArgInput } from "./argInputMetadata";
import { parseCommandStringDetailed } from "@/utils/CommandParser";

function toIso88591DoubleBlob(values: number[]): string {
  const bytes = new Uint8Array(values.length * 8);
  const view = new DataView(bytes.buffer);
  values.forEach((value, index) => {
    view.setFloat64(index * 8, value, false);
  });

  return String.fromCharCode(...bytes);
}

describe("ArgInput resolution", () => {
  it("treats missing map text as empty input", () => {
    expect(parseMapString(undefined)).toBeNull();
    expect(parseMapString(null)).toBeNull();
    expect(parseMapString("   ")).toBeNull();
  });

  it("decodes ISO-8859-1 byte blobs for static-key numeric-value maps", () => {
    const keyType = "AttackType";
    const mapBreakdown = getTypeBreakdown(CM, `Map<${keyType},Double>`);
    const keyBreakdown = mapBreakdown.child![0];
    const valueBreakdown = mapBreakdown.child![1];
    const options = keyBreakdown.getOptionData().options ?? [];
    const payload = options.map((_, index) => index + 0.5);
    const encoded = toIso88591DoubleBlob(payload);

    const parsed = parseMapStringDetailed(encoded, keyBreakdown, valueBreakdown);

    expect(parsed.entries).not.toBeNull();
    expect(parsed.entries).toHaveLength(options.length);
    expect(parsed.entries?.[0]).toEqual({ [options[0]]: String(payload[0]) });
    expect(parsed.entries?.[options.length - 1]).toEqual({ [options[options.length - 1]]: String(payload[payload.length - 1]) });
  });

  it("decodes zero-valued binary entries as empty strings", () => {
    const keyType = "AttackType";
    const mapBreakdown = getTypeBreakdown(CM, `Map<${keyType},Double>`);
    const keyBreakdown = mapBreakdown.child![0];
    const valueBreakdown = mapBreakdown.child![1];
    const options = keyBreakdown.getOptionData().options ?? [];
    const payload = options.map((_, index) => index === 0 ? 0 : index + 1);
    const encoded = toIso88591DoubleBlob(payload);

    const parsed = parseMapStringDetailed(encoded, keyBreakdown, valueBreakdown);

    expect(parsed.entries?.[0]).toEqual({ [options[0]]: "" });
    expect(parsed.entries?.[1]).toEqual({ [options[1]]: String(payload[1]) });
  });

  it("preserves leading and trailing raw bytes for binary fallback", () => {
    const keyType = "AttackType";
    const mapBreakdown = getTypeBreakdown(CM, `Map<${keyType},Double>`);
    const keyBreakdown = mapBreakdown.child![0];
    const valueBreakdown = mapBreakdown.child![1];
    const options = keyBreakdown.getOptionData().options ?? [];
    const bytes = new Uint8Array(options.length * 8);

    bytes[0] = 0x20;
    bytes[bytes.length - 1] = 0x0a;

    const encoded = String.fromCharCode(...bytes);
    const parsed = parseMapStringDetailed(encoded, keyBreakdown, valueBreakdown);

    expect(parsed.entries).toHaveLength(options.length);
  });

  it("skips byte fallback when encoded length does not match expected key count", () => {
    const keyType = "AttackType";
    const mapBreakdown = getTypeBreakdown(CM, `Map<${keyType},Double>`);
    const keyBreakdown = mapBreakdown.child![0];
    const valueBreakdown = mapBreakdown.child![1];
    const binaryLikeInput = String.fromCharCode(0, 1, 2, 3);

    const parsed = parseMapStringDetailed(binaryLikeInput, keyBreakdown, valueBreakdown);

    expect(parsed.entries).toBeNull();
    expect(parsed.error).toContain("expected");
  });

  it("rejects mixed recognized and unrecognized command argument names", () => {
    const command = CM.builder("test-parse")
      .argument("known", false, "", "String")
      .argument("alsoKnown", true, "", "String")
      .build();

    const parsed = parseCommandStringDetailed(command, "/test-parse known:ok unknown:nope");

    expect(parsed.values).toBeNull();
    expect(parsed.error).toContain("unknown");
  });

  it("keeps List inputs aligned with Set", () => {
    const listBreakdown = getTypeBreakdown(CM, "List<String>");
    const setBreakdown = getTypeBreakdown(CM, "Set<String>");

    expect(listBreakdown.getOptionData().multi).toBe(true);
    expect(resolveArgInput(listBreakdown)).toMatchObject({
      kind: resolveArgInput(setBreakdown).kind,
      componentName: resolveArgInput(setBreakdown).componentName,
    });
  });

  it("routes placeholder expression families to the shared expression input", () => {
    const types = [
      "Set<DBNation>",
      "Predicate<DBNation>",
      "TypedFunction<DBNation,String>",
      "TypedFunction<DBNation,Double>",
    ];

    for (const type of types) {
      expect(resolveArgInput(getTypeBreakdown(CM, type))).toMatchObject({
        kind: "placeholder-expression",
        componentName: "PlaceholderExpressionInput",
      });
    }
  });

  it("keeps static-option sets on static option inputs instead of placeholder expressions", () => {
    expect(resolveArgInput(getTypeBreakdown(CM, "Set<AttackType>"))).toMatchObject({
      kind: "static-options",
      componentName: "ListComponentOptions",
    });
  });
});
