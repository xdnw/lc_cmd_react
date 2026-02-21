import { Unpackr } from "msgpackr";

export const UNPACKR = new Unpackr({
  largeBigIntToFloat: true,
  mapsAsObjects: true,
  bundleStrings: true,
  int64AsType: "number",
});
