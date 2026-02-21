import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export const DEBUG = {
  LOADING_WRAPPER: true,
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function getQueryParams(): URLSearchParams {
  const queryString = window.location.hash.split('?')[1];
  if (!queryString) return new URLSearchParams();
  try {
    return new URLSearchParams(decodeURIComponent(queryString));
  } catch (e) {
    return new URLSearchParams(queryString);
  }
}

export function queryParamsToObject(query: URLSearchParams): { [key: string]: string | string[] | undefined } {
  const obj: { [key: string]: string | string[] | undefined } = {};
  query.forEach((value, key) => {
    if (obj[key] === undefined) {
      obj[key] = value;
    } else if (Array.isArray(obj[key])) {
      (obj[key] as string[]).push(value);
    } else {
      obj[key] = [obj[key] as string, value];
    }
  });
  return obj;
}

export function deepEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;

  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }

  // Handle Map
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, value] of a) {
      if (!b.has(key) || !deepEqual(value, b.get(key))) {
        return false;
      }
    }
    return true;
  }

  // Handle Set
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const value of a) {
      if (!b.has(value)) {
        return false;
      }
    }
    return true;
  }

  const keysA = Object.keys(a) as Array<keyof T>;
  const keysB = Object.keys(b) as Array<keyof T>;

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
      return false;
    }
  }

  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
      return false;
    }
  }

  return true;
}