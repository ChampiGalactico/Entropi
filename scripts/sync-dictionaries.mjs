// Copies the Hunspell dictionary sources from the dictionary-* devDependencies
// into public/dictionaries so they are served as plain static assets. Vite can't
// deep-import "dictionary-en/index.aff" directly because those packages only
// expose "./index.js" via their package.json "exports" field.
import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, "..", "public", "dictionaries");

const languages = ["en", "es", "de"];

await mkdir(outDir, { recursive: true });

for (const lang of languages) {
  const pkgDir = path.dirname(
    fileURLToPath(import.meta.resolve(`dictionary-${lang}`)),
  );
  await copyFile(path.join(pkgDir, "index.aff"), path.join(outDir, `${lang}.aff`));
  await copyFile(path.join(pkgDir, "index.dic"), path.join(outDir, `${lang}.dic`));
}

console.log(`Synced dictionaries: ${languages.join(", ")}`);
