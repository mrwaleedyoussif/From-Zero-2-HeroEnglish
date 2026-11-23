"use client";

import { Link, usePathname } from "@/i18n/navigation";

/** The gate's links, with the current section marked (the longest link the path starts with). */
export function GateNavLinks({ items }: { items: readonly { href: string; label: string }[] }) {
  const pathname = usePathname();
  const current = items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return items.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={item.href === current ? "page" : undefined}
      className="rounded-md px-3 py-2 text-sm whitespace-nowrap hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-semibold aria-[current=page]:text-accent-foreground"
    >
      {item.label}
    </Link>
  ));
}
