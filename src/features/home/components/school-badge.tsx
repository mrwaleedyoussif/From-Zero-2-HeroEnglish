import Image from "next/image";
import { publicSchoolName } from "../schools";
import { schoolLogo } from "../school-logos";

/** "You are signing in to <school>": shown when the learner picked their school on the home page. */
export async function SchoolBadge({ code, locale }: { code: string; locale: string }) {
  const school = await publicSchoolName(code);
  if (!school) return null;
  const logo = schoolLogo(school.name_en);
  return (
    <p className="flex items-center gap-2 text-sm font-semibold text-[var(--tone-flat)]">
      {logo && (
        <Image
          src={logo}
          alt=""
          width={28}
          height={28}
          className="size-7 rounded-md bg-white object-contain p-0.5"
        />
      )}
      {locale === "ar" ? school.name_ar : school.name_en}
    </p>
  );
}
