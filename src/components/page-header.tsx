import type { ReactNode } from "react";
import { PageGlyph } from "./page-glyph";
import "./page-header.css";

/** Every page's banner: the section's icon, the title, a line about it and the page's buttons. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-hero flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <PageGlyph />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          {description && <p className="max-w-prose">{description}</p>}
        </div>
      </div>
      {/* Dark scope: the page's buttons take their on-dark colours on the banner. */}
      {actions && <div className="dark flex flex-wrap gap-2 text-white">{actions}</div>}
      <span aria-hidden className="page-hero-line" />
    </div>
  );
}
