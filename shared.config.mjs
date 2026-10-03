import path from "node:path";

const here = import.meta.dirname;

/** Identical config for rspack and webpack: native CSS modules, readable local ident names. */
export function createConfig(outDirName) {
  return {
    mode: "development",
    devtool: false,
    context: here,
    entry: "./src/index.js",
    output: { path: path.join(here, "dist", outDirName), clean: true },
    experiments: { css: true },
    module: {
      rules: [{ test: /\.module\.css$/, type: "css/module" }],
      generator: {
        // "LOCAL-" prefix makes it obvious in the output which class names were localized
        "css/module": { localIdentName: "LOCAL-[local]" },
        // "css/module": { localIndentName: "[base]→[local]→[fullhash:4]" },
      },
    },
  };
}
