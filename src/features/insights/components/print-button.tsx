"use client";

/** Dashboards export to PDF through the browser's print dialog ("Save as PDF"): Arabic shaping
 * and RTL stay correct, and chart data tables are printed open (menus are hidden with print:hidden). */
export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        // Printed dashboards include every chart's data table.
        for (const d of document.querySelectorAll<HTMLDetailsElement>("details[data-table]"))
          d.open = true;
        window.print();
      }}
      className="text-sm text-primary hover:underline"
    >
      🖨 {label}
    </button>
  );
}
