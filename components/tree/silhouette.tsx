import type { Sex } from "@/lib/validations";
import { cn } from "@/lib/utils";

/** A simple human-shadow avatar tinted by sex (blue / pink / neutral). */
export function Silhouette({
  sex,
  className,
}: {
  sex: Sex;
  className?: string;
}) {
  const tone =
    sex === "MALE"
      ? { bg: "bg-male-soft", fg: "text-male" }
      : sex === "FEMALE"
        ? { bg: "bg-female-soft", fg: "text-female" }
        : { bg: "bg-neutral2-soft", fg: "text-neutral2" };

  return (
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
        tone.bg,
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className={cn("h-7 w-7", tone.fg)}
        fill="currentColor"
        aria-hidden
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M12 14c-4.42 0-8 2.69-8 6v1h16v-1c0-3.31-3.58-6-8-6Z" />
      </svg>
    </div>
  );
}
