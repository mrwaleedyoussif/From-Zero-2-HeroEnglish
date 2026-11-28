"use client";

import { type RefObject, useEffect, useState } from "react";
import { place, type Placed } from "../strokes/place";
import type { Style } from "../types";

/** The text laid out for the box it sits in; laid out again when the box changes width. */
export function usePlaced(
  box: RefObject<HTMLElement | null>,
  style: Style,
  text: string,
  maxH?: number,
): Placed | null {
  const [placed, setPlaced] = useState<Placed | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let width = 0;
    const lay = () => {
      const w = Math.floor(el.clientWidth);
      if (!w || w === width) return;
      width = w;
      setPlaced(place(style, text, w, { maxH }));
    };
    lay();
    const ro = new ResizeObserver(lay);
    ro.observe(el);
    return () => ro.disconnect();
  }, [box, style, text, maxH]);
  return placed;
}
