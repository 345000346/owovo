import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const notoSource = resolve(
  root,
  "node_modules/@fontsource-variable/noto-serif-sc",
);
const sourceCodeSource = resolve(
  root,
  "node_modules/@fontsource/source-code-pro/files",
);
const fontDirectory = resolve(root, "static/fonts");
const cssDirectory = resolve(root, "assets/css");

await rm(fontDirectory, { force: true, recursive: true });
await mkdir(fontDirectory, { recursive: true });
await mkdir(cssDirectory, { recursive: true });

await cp(resolve(notoSource, "files"), fontDirectory, { recursive: true });

const sourceCodeFiles = [
  "source-code-pro-latin-400-normal.woff2",
  "source-code-pro-latin-400-italic.woff2",
  "source-code-pro-latin-700-normal.woff2",
  "source-code-pro-latin-700-italic.woff2",
];

for (const file of sourceCodeFiles) {
  await cp(resolve(sourceCodeSource, file), resolve(fontDirectory, file));
}

const notoCss = await readFile(resolve(notoSource, "index.css"), "utf8");
const sourceCodeCss = sourceCodeFiles
  .map((file) => {
    const [, weight, style] = file.match(/-(400|700)-(normal|italic)\.woff2$/);
    return `@font-face {
  font-family: "Source Code Pro";
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url("/fonts/${file}") format("woff2");
}`;
  })
  .join("\n\n");

const fontsCss = `${notoCss
  .replaceAll("'Noto Serif SC Variable'", '"Noto Serif SC"')
  .replaceAll("url(./files/", 'url("/fonts/')
  .replaceAll(".woff2) format", '.woff2\") format')}\n\n${sourceCodeCss}\n`;

await writeFile(resolve(cssDirectory, "fonts.css"), fontsCss);
