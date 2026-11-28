"use client";

import type { Style } from "../types";
import { StrokeDemo } from "./stroke-demo";

/** A small still picture of a letter or word in the hand being learnt, for the list of steps. */
export function StrokeThumb({ style, text }: { style: Style; text: string }) {
  return (
    <span className="block w-full [&_div]:border-0 [&_div]:bg-transparent">
      <StrokeDemo style={style} text={text} maxH={54} still />
    </span>
  );
}
