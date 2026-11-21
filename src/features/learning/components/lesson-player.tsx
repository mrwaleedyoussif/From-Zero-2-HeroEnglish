import { getTranslations } from "next-intl/server";
import type { OpenableLesson } from "../lessons/queries";

/** youtube.com/watch?v=ID, youtu.be/ID → privacy-enhanced embed URL; anything else → null. */
export function youTubeEmbed(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const id =
      host === "youtu.be"
        ? u.pathname.slice(1)
        : host === "youtube.com" || host === "m.youtube.com"
          ? (u.searchParams.get("v") ?? u.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1])
          : null;
    return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

/** Lesson material by format (SPEC §9): video, audio, PDF/doc viewer, or a link to open. */
export async function LessonPlayer({ lesson }: { lesson: OpenableLesson }) {
  const t = await getTranslations("Learning");
  const media = lesson.media_asset_id ? `/api/media/${lesson.media_asset_id}` : null;
  const mime = lesson.media_assets?.mime_type ?? "";
  const embed = youTubeEmbed(lesson.content_url);
  const href = media ?? lesson.content_url;

  let body: React.ReactNode = null;
  if (embed) {
    body = (
      <iframe
        src={embed}
        title={lesson.title_en}
        className="aspect-video w-full rounded-lg border"
        allow="encrypted-media; picture-in-picture"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-presentation"
      />
    );
  } else if (media && mime.startsWith("audio/")) {
    body = <audio controls preload="metadata" src={media} className="w-full" data-player="audio" />;
  } else if (media && mime.startsWith("video/")) {
    body = <video controls preload="metadata" src={media} className="w-full rounded-lg" />;
  } else if (media && mime.startsWith("image/")) {
    // eslint-disable-next-line @next/next/no-img-element -- private proxy URL, not optimisable
    body = <img src={media} alt={lesson.title_en} className="max-h-[70vh] rounded-lg" />;
  } else if (media && mime === "application/pdf") {
    body = (
      <iframe src={media} title={lesson.title_en} className="h-[70vh] w-full rounded-lg border" />
    );
  }

  return (
    <section className="flex flex-col gap-3" data-format={lesson.format}>
      {lesson.objectives && (
        <p className="rounded-md bg-muted p-3">
          <span className="font-medium">{t("objectives")}: </span>
          {lesson.objectives}
        </p>
      )}
      {body}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("openMaterial")}
        </a>
      )}
    </section>
  );
}
