import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { installBackendSessionCookieJar } from "./backendSession";

installBackendSessionCookieJar();

afterEach(() => {
	cleanup();
});

if (!window.matchMedia) {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
}

if (!window.ResizeObserver) {
	class ResizeObserver {
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {}
	}

	window.ResizeObserver = ResizeObserver;
	globalThis.ResizeObserver = ResizeObserver;
}

if (!window.IntersectionObserver) {
	class IntersectionObserver {
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {}
		takeRecords(): IntersectionObserverEntry[] {
			return [];
		}
		readonly root = null;
		readonly rootMargin = "0px";
		readonly thresholds = [];
	}

	window.IntersectionObserver = IntersectionObserver as typeof window.IntersectionObserver;
	globalThis.IntersectionObserver = IntersectionObserver as typeof globalThis.IntersectionObserver;
}

if (!HTMLElement.prototype.scrollIntoView) {
	HTMLElement.prototype.scrollIntoView = vi.fn();
}

if (!window.URL.createObjectURL) {
	window.URL.createObjectURL = vi.fn(() => "blob:mock");
}

if (!window.URL.revokeObjectURL) {
	window.URL.revokeObjectURL = vi.fn();
}
