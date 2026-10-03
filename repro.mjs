/**
 * Builds src/styles.module.css with rspack and with webpack using the same config and
 * prints every emitted CSS line that differs. Exits with code 1 when there are differences.
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { rspack } from "@rspack/core";
import webpack from "webpack";

import { createConfig } from "./shared.config.mjs";

const require = createRequire(import.meta.url);
const here = import.meta.dirname;

function build(bundler, name) {
  return new Promise((resolve, reject) => {
    bundler(createConfig(name), (error, stats) => {
      if (error) {
        reject(error);
        return;
      }
      if (stats.hasErrors()) {
        reject(new Error(stats.toString({ errors: true, colors: false })));
        return;
      }
      resolve(fs.readFileSync(path.join(here, "dist", name, "main.css"), "utf8"));
    });
  });
}

// webpack prepends a "/*!*** css ./src/styles.module.css ***!*\" banner; drop it so the lines align
const withoutBanner = (css) => css.split("\n").filter((line) => !/^\s*(\/\*!|!\*\*|\\\*\*)/.test(line));

const rspackLines = withoutBanner(await build(rspack, "rspack"));
const webpackLines = withoutBanner(await build(webpack, "webpack"));

console.log(`@rspack/core ${require("@rspack/core/package.json").version}, webpack ${require("webpack/package.json").version}`);
console.log("localIdentName: LOCAL-[local]\n");

let differences = 0;
for (let i = 0; i < Math.max(rspackLines.length, webpackLines.length); i++) {
  const fromRspack = (rspackLines[i] ?? "").trim();
  const fromWebpack = (webpackLines[i] ?? "").trim();
  if (fromRspack === fromWebpack) {
    continue;
  }
  differences++;
  console.log(`  rspack:  ${fromRspack}\n  webpack: ${fromWebpack}\n`);
}

if (differences === 0) {
  console.log("No differences: rspack output matches webpack.");
} else {
  console.log(`${differences} rule(s) differ. Full output: dist/rspack/main.css vs dist/webpack/main.css`);
}
process.exit(differences === 0 ? 0 : 1);
