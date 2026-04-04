import { RefObject, useLayoutEffect, useRef } from "react";

const DEFAULT_WINDOW_OFFSET = 96;
const SCROLLABLE_VALUES = new Set(["auto", "scroll", "overlay"]);

const isScrollable = (element: HTMLElement) => {
  const styles = window.getComputedStyle(element);

  return (
    SCROLLABLE_VALUES.has(styles.overflowY) &&
    element.scrollHeight > element.clientHeight + 1
  );
};

const getNearestScrollContainer = (element: HTMLElement | null) => {
  let current = element;

  while (current && current !== document.body && current !== document.documentElement) {
    if (isScrollable(current)) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
};

const getWindowTop = () => document.scrollingElement?.scrollTop ?? window.scrollY ?? 0;

const scrollAnchorIntoPlace = (anchor: HTMLElement | null, windowOffset: number) => {
  if (!anchor) return;

  const scrollContainer = getNearestScrollContainer(anchor.parentElement);

  if (scrollContainer) {
    const containerRect = scrollContainer.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const nextTop = scrollContainer.scrollTop + (anchorRect.top - containerRect.top);

    scrollContainer.scrollTo({ top: Math.max(nextTop, 0), left: 0, behavior: "auto" });
    return;
  }

  const nextTop = anchor.getBoundingClientRect().top + getWindowTop() - windowOffset;
  window.scrollTo({ top: Math.max(nextTop, 0), left: 0, behavior: "auto" });
};

export const useStepScrollReset = (
  anchorRef: RefObject<HTMLElement>,
  dependencies: ReadonlyArray<unknown>,
  options?: {
    enabled?: boolean;
    skipInitial?: boolean;
    windowOffset?: number;
  },
) => {
  const hasMountedRef = useRef(false);
  const enabled = options?.enabled ?? true;
  const skipInitial = options?.skipInitial ?? true;
  const windowOffset = options?.windowOffset ?? DEFAULT_WINDOW_OFFSET;

  useLayoutEffect(() => {
    if (!enabled) return;

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;

      if (skipInitial) {
        return;
      }
    }

    scrollAnchorIntoPlace(anchorRef.current, windowOffset);

    const correctionFrame = window.requestAnimationFrame(() => {
      scrollAnchorIntoPlace(anchorRef.current, windowOffset);
    });

    return () => {
      window.cancelAnimationFrame(correctionFrame);
    };
  }, dependencies);
};