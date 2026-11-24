import { LayoutGrid } from "lucide-react";
import type { Audience } from "@/features/departments/catalog";
import { Link } from "@/i18n/navigation";
import type { HomeTexts } from "../copy";

/** A way to preview the departments before signing in. */
export function DepartmentsLink({ texts, audience }: { texts: HomeTexts; audience: Audience }) {
  const other = texts.other.lang;
  return (
    <Link
      href={`/departments/${audience}`}
      className="z2h-rise inline-flex min-h-11 items-center gap-2 self-center rounded-full border border-white/20 bg-white/10 px-5 font-semibold text-white outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
    >
      <LayoutGrid aria-hidden className="size-5 text-[#fcd34d]" />
      {texts.main.copy.seeDepartments}
      <span lang={other} dir={other === "ar" ? "rtl" : "ltr"} className="font-normal opacity-80">
        {texts.other.copy.seeDepartments}
      </span>
    </Link>
  );
}
