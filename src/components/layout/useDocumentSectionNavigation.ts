import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface UseDocumentSectionNavigationOptions {
    activationOffset?: number;
    scrollBehavior?: ScrollBehavior;
}

export interface DocumentSectionNavigation {
    activeSectionId: string | null;
    getSectionRef: (sectionId: string) => (node: HTMLElement | null) => void;
    scrollToSection: (sectionId: string) => void;
}

export default function useDocumentSectionNavigation(
    sectionIds: readonly string[],
    options?: UseDocumentSectionNavigationOptions,
): DocumentSectionNavigation {
    const activationOffset = options?.activationOffset ?? 160;
    const scrollBehavior = options?.scrollBehavior ?? "smooth";
    const nodesRef = useRef<Record<string, HTMLElement | null>>({});
    const frameRef = useRef<number | null>(null);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(sectionIds[0] ?? null);

    const orderedSectionIds = useMemo(() => Array.from(sectionIds), [sectionIds]);

    const updateActiveSection = useCallback(() => {
        const availableIds = orderedSectionIds.filter((sectionId) => nodesRef.current[sectionId]);
        if (availableIds.length === 0) {
            setActiveSectionId(null);
            return;
        }

        let nextActiveId = availableIds[0];
        for (const sectionId of availableIds) {
            const node = nodesRef.current[sectionId];
            if (!node) {
                continue;
            }

            const top = node.getBoundingClientRect().top;
            if (top - activationOffset <= 0) {
                nextActiveId = sectionId;
                continue;
            }

            break;
        }

        setActiveSectionId((current) => (current === nextActiveId ? current : nextActiveId));
    }, [activationOffset, orderedSectionIds]);

    const scheduleActiveSectionUpdate = useCallback(() => {
        if (typeof window === "undefined") {
            updateActiveSection();
            return;
        }

        if (frameRef.current != null) {
            window.cancelAnimationFrame(frameRef.current);
        }

        frameRef.current = window.requestAnimationFrame(() => {
            frameRef.current = null;
            updateActiveSection();
        });
    }, [updateActiveSection]);

    useEffect(() => {
        scheduleActiveSectionUpdate();
    }, [orderedSectionIds, scheduleActiveSectionUpdate]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return undefined;
        }

        const handleScroll = () => {
            scheduleActiveSectionUpdate();
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        window.addEventListener("resize", handleScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", handleScroll);
            if (frameRef.current != null) {
                window.cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
        };
    }, [scheduleActiveSectionUpdate]);

    useEffect(() => {
        if (!activeSectionId || orderedSectionIds.includes(activeSectionId)) {
            return;
        }

        setActiveSectionId(orderedSectionIds[0] ?? null);
    }, [activeSectionId, orderedSectionIds]);

    const getSectionRef = useCallback((sectionId: string) => (node: HTMLElement | null) => {
        nodesRef.current[sectionId] = node;
        scheduleActiveSectionUpdate();
    }, [scheduleActiveSectionUpdate]);

    const scrollToSection = useCallback((sectionId: string) => {
        const node = nodesRef.current[sectionId];
        if (!node) {
            return;
        }

        node.scrollIntoView({ behavior: scrollBehavior, block: "start" });
        setActiveSectionId((current) => (current === sectionId ? current : sectionId));
    }, [scrollBehavior]);

    return {
        activeSectionId,
        getSectionRef,
        scrollToSection,
    };
}
