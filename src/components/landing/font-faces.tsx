import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Emits @font-face rules only for the licensed faces actually present on disk.
 *
 * Both faces are commercial, so on a fresh checkout none of them exist and the
 * page should silently use the Google fallbacks wired up in layout.tsx.
 * Declaring them unconditionally in globals.css would make the browser request
 * every src in the list and log a 404 per format on every page load.
 */

/* Palo Compressed Bold reports usWeightClass 400 despite the name, so it is
   declared at 400 — asking for 700 would make the browser synthesise a bold on
   top of an already-bold face and thicken the strokes unevenly. */
const FACES = [
  { family: "Palo", base: "Palo-CompressedBold", weight: "400" },
  { family: "Banda Nova", base: "BandaNova-Book", weight: "400" },
];

const FORMATS = [
  { ext: "woff2", format: "woff2" },
  { ext: "otf", format: "opentype" },
  { ext: "ttf", format: "truetype" },
];

export function FontFaces() {
  const rules = FACES.flatMap((face) => {
    const found = FORMATS.filter(({ ext }) =>
      existsSync(join(process.cwd(), "public", "fonts", `${face.base}.${ext}`)),
    );

    if (found.length === 0) return [];

    const src = found
      .map(
        ({ ext, format }) =>
          `url("/fonts/${face.base}.${ext}") format("${format}")`,
      )
      .join(", ");

    return [
      `@font-face{font-family:"${face.family}";src:${src};font-weight:${face.weight};font-style:normal;font-display:swap;}`,
    ];
  });

  if (rules.length === 0) return null;

  return <style>{rules.join("")}</style>;
}
