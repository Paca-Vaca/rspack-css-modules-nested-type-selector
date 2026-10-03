# rspack CSS modules: nested rules starting with a type selector are not localized

Minimal reproduction for an rspack native CSS modules bug (`experiments.css` + `type: "css/module"`,
no loaders involved).

A style rule that is nested inside a block (`@media`, `@supports`, `@container`, `@layer`, or another
style rule) and whose selector **starts with a type selector** (`button.root`, `div .child`, …) is
emitted verbatim: none of its class names (or ids) are localized, and `:global()` / `:local()` are left
in the output as-is. The same selector at the top level, or the same nested rule starting with `.`,
`*`, `:is()`, `#` or `&`, is handled correctly. webpack 5 with the same config localizes all of them.

## Run

```sh
npm install
node repro.mjs
```

`repro.mjs` builds `src/styles.module.css` with rspack and with webpack using the identical config in
`shared.config.mjs` (`localIdentName: "LOCAL-[local]"` so localized names are easy to spot), then
prints every emitted line that differs and exits with code 1 if there are any.

Or build with the CLIs and compare the files by hand:

```sh
npx rspack build    # -> dist/rspack/main.css
npx webpack         # -> dist/webpack/main.css
```

## Expected

Every class name in `src/styles.module.css` is emitted as `LOCAL-<name>` by both bundlers, except the
ones wrapped in `:global()`.

## Actual (rspack)

```css
@media (hover: hover) { button.root.hovered { color: blue; } }      /* expected button.LOCAL-root.LOCAL-hovered */
@media (hover: hover) { div .root { color: blue; } }                /* expected div .LOCAL-root */
@supports (display: grid) { button.root { color: blue; } }          /* expected button.LOCAL-root */
.LOCAL-outer { button.inner { color: blue; } }                      /* expected button.LOCAL-inner */
@media (hover: hover) { button.first, .second { color: blue; } }    /* expected button.LOCAL-first, .LOCAL-second */
@media (hover: hover) { button.root:global(.plain) { color: blue; } } /* expected button.LOCAL-root.plain; ":global(" reaches the browser */
```

See `src/styles.module.css` for the full list of failing and passing cases.
