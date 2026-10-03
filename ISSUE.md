# [Bug]: CSS modules: a nested rule whose selector starts with a type selector is not localized

Target repository: `web-infra-dev/rspack` (the reproduction uses only `@rspack/core`, no rsbuild or storybook).
Sections below follow rspack's "Bug report" issue template.

## System Info

```
  System:
    OS: macOS 26.5.2
    CPU: (14) arm64 Apple M4 Pro
    Memory: 114.61 MB / 48.00 GB
    Shell: 5.9 - /bin/zsh
  Binaries:
    Node: 24.14.1
    Yarn: 1.22.22
    npm: 11.11.0
    Deno: 2.8.3
  Browsers:
    Chrome: 154.0.8037.93
    Firefox: 155.0.1
    Safari: 26.5.2
  npmPackages:
    @rspack/cli: 2.2.8 => 2.2.8 
    @rspack/core: 2.2.8 => 2.2.8
```

Reproduced with `@rspack/core` 2.2.6 and 2.2.8 (`experiments.css: true`, `type: "css/module"`, no loaders).
`webpack` 5.108.4 with the identical configuration produces the expected output.

## Details

With native CSS modules, a style rule that is **nested inside any block**  and whose **selector starts with a
type selector** is emitted verbatim. "Any block" means the body of `@media`, `@supports`, `@container`,
`@layer`, and also the body of another style rule (CSS nesting). Nothing in that rule's selector list is
transformed:

- `.class` and `#id` are not localized: the raw names are emitted and leak as globals;
- `:global(...)` / `:local(...)` are not stripped, so the browser receives `button.root:global(.plain)` and
  drops the whole rule as invalid;
- later selectors in the same list are skipped too (`button.first, .second`), although `.second` starts
  with a class.

The same rule at the top level is handled correctly. A nested rule whose selector starts with anything else
(`.`, `#`, `*`, `:is(button)`, `&`) is handled correctly. Rules that follow a type-first rule, or are nested
inside it, are handled correctly. The bug depends only on the first token of a nested rule's prelude.

Input (`src/styles.module.css`, with `localIdentName: "LOCAL-[local]"` for readability):

```css
button.root.hovered { color: red; }                                   /* top level */
@media (hover: hover) { .root.hovered { color: green; } }              /* nested, class first */
@media (hover: hover) { button.root.hovered { color: blue; } }         /* nested, type first */
@media (hover: hover) { div .root { color: blue; } }
@supports (display: grid) { button.root { color: blue; } }
.outer { button.inner { color: blue; } }
@media (hover: hover) { button.first, .second { color: blue; } }
@media (hover: hover) { button.root:global(.plain) { color: blue; } }
```

rspack output:

```css
button.LOCAL-root.LOCAL-hovered { color: red; }
@media (hover: hover) { .LOCAL-root.LOCAL-hovered { color: green; } }
@media (hover: hover) { button.root.hovered { color: blue; } }         /* BUG */
@media (hover: hover) { div .root { color: blue; } }                   /* BUG */
@supports (display: grid) { button.root { color: blue; } }             /* BUG */
.LOCAL-outer { button.inner { color: blue; } }                         /* BUG */
@media (hover: hover) { button.first, .second { color: blue; } }       /* BUG */
@media (hover: hover) { button.root:global(.plain) { color: blue; } }  /* BUG: invalid CSS reaches the browser */
```

webpack 5 output with the same configuration:

```css
button.LOCAL-root.LOCAL-hovered { color: red; }
@media (hover: hover) { .LOCAL-root.LOCAL-hovered { color: green; } }
@media (hover: hover) { button.LOCAL-root.LOCAL-hovered { color: blue; } }
@media (hover: hover) { div .LOCAL-root { color: blue; } }
@supports (display: grid) { button.LOCAL-root { color: blue; } }
.LOCAL-outer { button.LOCAL-inner { color: blue; } }
@media (hover: hover) { button.LOCAL-first, .LOCAL-second { color: blue; } }
@media (hover: hover) { button.LOCAL-root.plain { color: blue; } }
```

The JS export map is correct in both bundlers (`root` -> `"LOCAL-root"`), which is what makes this hard to
notice: the component applies the hashed class name, the stylesheet still contains the raw one, and the rule
silently never matches. In practice every `@media (hover: hover) { button.foo:hover { … } }` style is lost.

## Reproduce link

`https://github.com/Paca-Vaca/rspack-css-modules-nested-type-selector`

## Reproduce Steps

1. `npm install`
2. `node repro.mjs` builds `src/styles.module.css` with `@rspack/core` and with `webpack` using the identical
   config from `shared.config.mjs`, then prints every emitted CSS line that differs.
   Expected: no differences, exit code 0. Actual: 14 rules differ, exit code 1.
3. Alternatively run `npx rspack build` and open `dist/rspack/main.css`: every nested rule that starts with a
   type selector is identical to the source, with no localized class names.
