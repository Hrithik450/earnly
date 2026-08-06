import Image from "next/image";
import Link from "next/link";

/**
 * The wordmark: mark, "Earnly" set in the heading face, and the red dot.
 *
 * All three are one unit — the dot has been part of the lockup since it went on
 * the nav, so it travels with the mark rather than being re-declared per shell.
 * Previously the nav, dashboard, auth shell and footer each hand-rolled their
 * own copy and had already drifted apart.
 *
 * The image is `public/images/earnly-mark.png` rather than the supplied
 * `earnly-logo.png`: that file bakes the word EARNLY in underneath the coin on
 * an opaque white square, which would both duplicate the text beside it and
 * stamp a white block onto the cream footer.
 */
export function Logo({
  size = "md",
  href = "/",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  /** `null` renders a plain span — for shells where the logo is not a link. */
  href?: string | null;
  className?: string;
}) {
  const scale = {
    sm: { text: "text-xl", px: 22, dot: "h-1.5 w-1.5", gap: "gap-2" },
    md: { text: "text-2xl", px: 26, dot: "h-2 w-2", gap: "gap-2.5" },
    lg: { text: "text-[clamp(2.2rem,6vw,3.4rem)]", px: 52, dot: "h-3 w-3", gap: "gap-3.5" },
  }[size];

  const inner = (
    <>
      <Image
        src="/images/earnly-mark.png"
        alt=""
        width={scale.px}
        height={scale.px}
        /* Decorative: the word "Earnly" sits right beside it, so a second
           accessible name here would make every screen reader say it twice. */
        aria-hidden
        /* In the nav and footer on every route, so it should never be the thing
           holding up LCP behind a lazy-load observer. */
        priority
        className="flex-none"
      />
      {/* `display` rather than the inherited caption face — the footer wordmark
          was rendering in Banda Nova while every other instance used Palo. */}
      <span className={`display leading-none ${scale.text}`}>Earnly</span>
      <span
        className={`inline-block flex-none rounded-full ${scale.dot}`}
        style={{ background: "var(--red)" }}
        aria-hidden
      />
    </>
  );

  /* `items-center`, not `items-baseline`: the mark has no baseline, so aligning
     to one drops the image below the text. */
  const classes = `inline-flex items-center ${scale.gap} ${className}`;

  if (href === null) {
    return <span className={classes}>{inner}</span>;
  }

  return (
    <Link href={href} className={classes}>
      {inner}
    </Link>
  );
}
