import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Unpackr } from 'msgpackr';
export const UNPACKR = new Unpackr({largeBigIntToFloat: true, mapsAsObjects: true, bundleStrings: true, int64AsType: "number"});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function getQueryParams(): URLSearchParams {
  return new URLSearchParams(window.location.hash.split('?')[1]);
}

export function deepEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;

  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    console.log("TYPE", typeof a, typeof b);
    return false;
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    console.log("ARRAY", Array.isArray(a), Array.isArray(b));
    return false;
  }

  const keysA = Object.keys(a) as Array<keyof T>;
  const keysB = Object.keys(b) as Array<keyof T>;

  if (keysA.length !== keysB.length) {
    console.log("KEYS LENGTH", keysA, keysB);
    return false;
  }

  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
        console.log("KEY", key, a[key], b[key]);
      return false;
    }
  }

  return true;
}