export interface Language {
  name: string;
  color: string;
}

const lang = (name: string, color: string): Language => ({ name, color });

// Colors follow GitHub Linguist so the bars look familiar.
const TypeScript = lang('TypeScript', '#3178c6');
const JavaScript = lang('JavaScript', '#f1e05a');
const Python = lang('Python', '#3572A5');
const Kotlin = lang('Kotlin', '#A97BFF');
const C = lang('C', '#555555');
const Cpp = lang('C++', '#f34b7d');
const ObjectiveC = lang('Objective-C', '#438eff');
const Shell = lang('Shell', '#89e051');
const PowerShell = lang('PowerShell', '#012456');
const Html = lang('HTML', '#e34c26');
const Scss = lang('SCSS', '#c6538c');
const Markdown = lang('Markdown', '#083fa1');
const Yaml = lang('YAML', '#cb171e');
const Elixir = lang('Elixir', '#6e4a7e');
const Haskell = lang('Haskell', '#5e5086');
const OCaml = lang('OCaml', '#ef7a08');
const Clojure = lang('Clojure', '#db5855');
const Glsl = lang('GLSL', '#5686a5');

const BY_EXT: Record<string, Language> = {
  ts: TypeScript, tsx: TypeScript, mts: TypeScript, cts: TypeScript,
  js: JavaScript, jsx: JavaScript, mjs: JavaScript, cjs: JavaScript,
  py: Python, pyi: Python, ipynb: lang('Jupyter Notebook', '#DA5B0B'),
  go: lang('Go', '#00ADD8'),
  rs: lang('Rust', '#dea584'),
  java: lang('Java', '#b07219'),
  kt: Kotlin, kts: Kotlin,
  scala: lang('Scala', '#c22d40'),
  groovy: lang('Groovy', '#4298b8'),
  c: C, h: C,
  cc: Cpp, cpp: Cpp, cxx: Cpp, hpp: Cpp, hh: Cpp, hxx: Cpp,
  m: ObjectiveC, mm: ObjectiveC,
  cs: lang('C#', '#178600'),
  fs: lang('F#', '#b845fc'),
  swift: lang('Swift', '#F05138'),
  dart: lang('Dart', '#00B4AB'),
  rb: lang('Ruby', '#701516'),
  php: lang('PHP', '#4F5D95'),
  lua: lang('Lua', '#000080'),
  pl: lang('Perl', '#0298c3'),
  ex: Elixir, exs: Elixir,
  erl: lang('Erlang', '#B83998'),
  hs: Haskell, lhs: Haskell,
  ml: OCaml, mli: OCaml,
  clj: Clojure, cljs: Clojure, cljc: Clojure,
  r: lang('R', '#198CE7'),
  jl: lang('Julia', '#a270ba'),
  zig: lang('Zig', '#ec915c'),
  nim: lang('Nim', '#ffc200'),
  sol: lang('Solidity', '#AA6746'),
  gd: lang('GDScript', '#355570'),
  sh: Shell, bash: Shell, zsh: Shell, fish: Shell,
  ps1: PowerShell, psm1: PowerShell,
  html: Html, htm: Html,
  css: lang('CSS', '#663399'),
  scss: Scss, sass: Scss,
  less: lang('Less', '#1d365d'),
  vue: lang('Vue', '#41b883'),
  svelte: lang('Svelte', '#ff3e00'),
  astro: lang('Astro', '#ff5a03'),
  md: Markdown, markdown: Markdown,
  mdx: lang('MDX', '#fcb32c'),
  yml: Yaml, yaml: Yaml,
  toml: lang('TOML', '#9c4221'),
  sql: lang('SQL', '#e38c00'),
  graphql: lang('GraphQL', '#e10098'), gql: lang('GraphQL', '#e10098'),
  tf: lang('HCL', '#844FBA'),
  nix: lang('Nix', '#7e7eff'),
  glsl: Glsl, frag: Glsl, vert: Glsl,
  wgsl: lang('WGSL', '#1a5e9a'),
};

const BY_NAME: Record<string, Language> = {
  dockerfile: lang('Dockerfile', '#384d54'),
  makefile: lang('Makefile', '#427819'),
  'cmakelists.txt': lang('CMake', '#DA3434'),
  justfile: lang('Just', '#384d54'),
};

/** Language for a path, or undefined for data, assets and unknown files. */
export function languageOf(path: string): Language | undefined {
  const base = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
  const byName = BY_NAME[base];
  if (byName) return byName;
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return undefined;
  return BY_EXT[base.slice(dot + 1)];
}

const GENERATED = [
  /(^|\/)(node_modules|vendor|dist|build|\.next|coverage|__snapshots__)\//,
  /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|poetry\.lock|uv\.lock|Pipfile\.lock|Gemfile\.lock|composer\.lock|go\.sum|flake\.lock)$/,
  /\.min\.(js|css)$/,
  /\.(map|snap|svg|lock)$/,
];

/** Lock files, build output and the like: real commits, but not lines anyone wrote. */
export function isGenerated(path: string): boolean {
  return GENERATED.some((re) => re.test(path));
}
