import { describe, expect, it } from "vitest";

import { parseMapString, parseMapStringDetailed } from "@/utils/MapParser";
import { CM, getTypeBreakdown } from "@/utils/Command";
import { resolveArgInput } from "./argInputMetadata";
import { parseCommandStringDetailed } from "@/utils/CommandParser";
import { normalizeCityBuildModifiers, parseCityBuildInput, serializeParsedCityBuildValue, serializeCityBuildValue } from "./cityBuildInputUtils";

function toIso88591DoubleBlob(values: number[]): string {
  const bytes = new Uint8Array(values.length * 8);
  const view = new DataView(bytes.buffer);
  values.forEach((value, index) => {
    view.setFloat64(index * 8, value, false);
  });

  return String.fromCharCode(...bytes);
}

describe("ArgInput resolution", () => {
  const fullCityBuildExample = `{
    "infra_needed": 2800,
    "imp_total": 56,
    "imp_coalpower": 0,
    "imp_oilpower": 0,
    "imp_windpower": 0,
    "imp_nuclearpower": 2,
    "imp_coalmine": 0,
    "imp_oilwell": 10,
    "imp_uramine": 0,
    "imp_leadmine": 0,
    "imp_ironmine": 0,
    "imp_bauxitemine": 10,
    "imp_farm": 0,
    "imp_gasrefinery": 0,
    "imp_aluminumrefinery": 5,
    "imp_munitionsfactory": 0,
    "imp_steelmill": 0,
    "imp_policestation": 1,
    "imp_hospital": 3,
    "imp_recyclingcenter": 3,
    "imp_subway": 1,
    "imp_supermarket": 1,
    "imp_bank": 6,
    "imp_mall": 4,
    "imp_stadium": 3,
    "imp_barracks": 0,
    "imp_factory": 2,
    "imp_hangars": 5,
    "imp_drydock": 0
  }`;

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

  it("ignores named arguments that are not prefixed with the command", () => {
    const command = CM.builder("test-parse")
      .argument("known", false, "", "String")
      .argument("alsoKnown", true, "", "String")
      .build();

    const parsed = parseCommandStringDetailed(command, "known:ok alsoKnown:still-ok");

    expect(parsed.values).toBeNull();
    expect(parsed.error).toBeUndefined();
    expect(parsed.matchedCommandReference).toBeUndefined();
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

  it("resolves CityBuild to the dedicated composite input", () => {
    expect(resolveArgInput(getTypeBreakdown(CM, "CityBuild"))).toMatchObject({
      kind: "citybuild",
      componentName: "CityBuildInput",
    });
  });

  it("parses map-only and combined CityBuild values into canonical output", () => {
    const mapOnly = parseCityBuildInput("{land:2500,infra_needed:1800}");

    expect(serializeParsedCityBuildValue(mapOnly)).toBe("{infra_needed:1800,land:2500}");

    const combined = parseCityBuildInput("city/id=1{infra_needed:1234,land:5678,impCoalpower:3}");

    expect(combined.error).toBeUndefined();
    expect(serializeParsedCityBuildValue(combined)).toBe("city/id=1{infra_needed:1234,land:5678,imp_coalpower:3}");
  });

  it("dedupes duplicate CityBuild modifiers through shared keyed normalization", () => {
    const normalized = normalizeCityBuildModifiers([
      { key: "imp_bank", value: "1" },
      { key: "land", value: "5" },
      { key: "imp_bank", value: "2" },
    ]);

    expect(normalized.modifiers).toEqual([
      { key: "land", value: "5" },
      { key: "imp_bank", value: "2" },
    ]);
    expect(normalized.notices.some((notice) => notice.message.includes('Modifier "imp_bank" replaced an earlier value.'))).toBe(true);
  });

  it("ignores imp_total in CityBuild modifiers", () => {
    const parsed = parseCityBuildInput("city/id=1{imp_total:999,age:7,impCoalpower:3}");

    expect(parsed.error).toBeUndefined();
    expect(parsed.note).toContain("Ignored imp_total");
    expect(serializeCityBuildValue(parsed.cityId, parsed.modifiers)).toBe("city/id=1{age:7,imp_coalpower:3}");
  });

  it("parses the full provided CityBuild json example and drops imp_total", () => {
    const parsed = parseCityBuildInput(fullCityBuildExample);

    expect(parsed.error).toBeUndefined();
    expect(parsed.note).toContain("Ignored imp_total");
    expect(parsed.modifiers).toHaveLength(28);
    expect(serializeParsedCityBuildValue(parsed)).toBe(
      "{infra_needed:2800,imp_aluminumrefinery:5,imp_bank:6,imp_barracks:0,imp_bauxitemine:10,imp_coalmine:0,imp_coalpower:0,imp_drydock:0,imp_factory:2,imp_farm:0,imp_gasrefinery:0,imp_hangars:5,imp_hospital:3,imp_ironmine:0,imp_leadmine:0,imp_mall:4,imp_munitionsfactory:0,imp_nuclearpower:2,imp_oilpower:0,imp_oilwell:10,imp_policestation:1,imp_recyclingcenter:3,imp_stadium:3,imp_steelmill:0,imp_subway:1,imp_supermarket:1,imp_uramine:0,imp_windpower:0}"
    );
  });
});
