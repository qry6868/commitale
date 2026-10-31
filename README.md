<div align="center">

# git wrapped

**Your year in code.** A Spotify Wrapped-style report for your git history.

One command. Every repo on your machine. Nothing leaves your computer.

[![npm](https://img.shields.io/npm/v/git-wrapped?color=8b5cf6)](https://www.npmjs.com/package/git-wrapped)
[![CI](https://github.com/qry6868/git-wrapped/actions/workflows/ci.yml/badge.svg)](https://github.com/qry6868/git-wrapped/actions/workflows/ci.yml)
![zero dependencies](https://img.shields.io/badge/dependencies-0-d946ef)
[![license](https://img.shields.io/badge/license-MIT-fb7185)](LICENSE)

English · [简体中文](README.zh-CN.md)

<img src="assets/demo-card.svg" alt="A git wrapped share card: 653 commits, 22k lines added, 164 active days, a 41-day streak, a commit heatmap and top languages. Persona: The Night Owl." width="760">

</div>

```bash
npx git-wrapped ~/code
```

That's it. git-wrapped finds every repository under the folder, reads your commits from this year and opens a scrollable story in your browser.

## What you get

- **The big numbers.** Commits, lines added and deleted, active days, repos touched.
- **Your year as a heatmap.** Every day, across every repo: your private work too, not just what GitHub sees.
- **Streaks and spikes.** Your longest run of consecutive days and your busiest day.
- **Your rhythm.** The hour you peak, your power weekday, your biggest month.
- **Moments.** Your first commit of the year, your latest-night commit (yes, that 3:47 AM one) and your biggest.
- **Languages and repos.** Where your time actually went.
- **Your words.** The words you reach for most in commit messages, and how many commits were fixes.
- **Your coding personality.** Night Owl, Weekend Warrior, Marathoner, Bug Hunter… see [all of them](#personalities).
- **A share card.** A 1200×630 card, ready for X, LinkedIn or your GitHub profile README (download as PNG or SVG).

It runs in your terminal too:

```
  ✦ git wrapped 2026  ·  Alex Chen

  653 commits  ·  across 5 repos, on 164 different days
  +21,851  −12,760

  ·▓·░░···▒░░█▓▒█··▒·▒··░█·▒····▒·▒░░··▓░█············
  ▓▒██·▓··██▒░▒▓░█·█░··█▒·▓▒░·█·▒····█▓···▓···········
  ░█·░▓·▒░██░░░▓▓░█·▓▒·█▓·█··░·····░▒▓▒░··▓░··········
  █·░▒█▓▓▓▒░█▓░▓▒▓░█···▒·▒·▒░·██··▓··░█░·▓░·█·········
  ▓▒▒···░▓░▓░▓░▒░·▒·····░▒░··░░·█··░·▓···▒░·▒▓·········
  ··█▒····▒░░▒▓█░█··▓░░·▓·░·····▒···░░···▒···░········
  ···▓·█·▓·█▒▓▒█····░·▒█······░··········▒···█········

  Longest streak        41 days Mar 1 → Apr 10
  Busiest day           Mar 2 · 36 commits
  Peak hour             10 PM
  Latest-night commit   04:47 "docs: auth flow"

  Top languages
  TypeScript  ███████░░░░░░░░░░░░░░░░░  31%
  Rust        ███░░░░░░░░░░░░░░░░░░░░░  14%
  Go          ███░░░░░░░░░░░░░░░░░░░░░  13%

  You are 🦉 The Night Owl
```

## Private by design

git-wrapped reads your local repositories with `git log` and writes two files next to you: an HTML report and an SVG card. It makes **no network requests**: no telemetry, no API tokens, no uploads. The report works offline.

Sharing something about work? `--anonymize` hides repo names and commit messages.

## Usage

```bash
npx git-wrapped                       # the repo or folder you're in
npx git-wrapped ~/code ~/work         # several folders
npx git-wrapped ~/code --year 2025    # another year
npx git-wrapped . --all-authors --name "Team Rocket"   # a team report
```

| Option | Description |
| --- | --- |
| `-y, --year <year>` | Year to wrap. Defaults to this year (last year during January). |
| `-a, --author <id>` | Your email or name. Repeat it for several identities. Defaults to `user.email` and `user.name` from your global and per-repo git config. |
| `--all-authors` | Count everyone's commits, for a team report. |
| `--name <name>` | Name shown on the report. |
| `-d, --depth <n>` | How many folder levels to search for repositories (default `3`). |
| `-o, --out <dir>` | Where to write the report and card (default: current folder). |
| `--lang <en\|zh>` | Report language. Defaults to your system locale. |
| `--anonymize` | Hide repo names and commit messages. |
| `--json` | Print the raw stats as JSON and write no files. |
| `--no-open` | Don't open the report in a browser. |

Requires Node.js 20+ and git.

### Commit from more than one email?

git-wrapped picks up the emails configured in each repo automatically. For anything else (an old laptop, a GitHub noreply address) add them:

```bash
npx git-wrapped ~/code -a me@work.com -a me@home.dev -a 1234+me@users.noreply.github.com
```

If nothing matches, git-wrapped lists the authors it found so you can pick yours.

### Put the card on your GitHub profile

Commit the generated `git-wrapped-2026.svg` to your profile repository (`<username>/<username>`) and add:

```markdown
![git wrapped 2026](./git-wrapped-2026.svg)
```

## Personalities

You get the first one that fits, plus badges for the rest.

| | Personality | You earn it when… |
| --- | --- | --- |
| 🦉 | The Night Owl | 30%+ of your commits land between 10 PM and 5 AM |
| 🌅 | The Early Bird | 25%+ of your commits land between 5 and 9 AM |
| ⚔️ | The Weekend Warrior | 35%+ of your commits happen on weekends |
| 🏃 | The Marathoner | you commit 21+ days in a row |
| 🐛 | The Bug Hunter | 30%+ of your commits are fixes |
| 🧹 | The Cleaner | you delete more code than you add (and at least 1,000 lines) |
| 🌍 | The Polyglot | 5+ languages each make up 5%+ of your changes |
| 💼 | The Professional | 70%+ of your commits are on weekdays, 9 to 6 |
| 🧱 | The Steady Builder | none of the above: you just keep shipping |

## How it counts

- **Commits** are non-merge commits on any branch, authored in the given year, matched to you by email or name. A commit that appears in several clones or forks is counted once.
- **Times** use the timezone you committed in, so a 2 AM commit while traveling is still a 2 AM commit.
- **Lines** skip lock files, build output, vendored code, minified files and source maps.
- **Languages** are detected by file extension, with GitHub Linguist colors.

## Contributing

Ideas, bug reports and pull requests are very welcome. New personalities and translations are a great first contribution.

```bash
git clone https://github.com/qry6868/git-wrapped && cd git-wrapped
npm install
npm run demo     # builds fake repos with a year of history and runs on them
npm test
```

Translations live in [`src/i18n.ts`](src/i18n.ts). Add a language there and to `--lang`.

## License

[MIT](LICENSE)

<div align="center">

If git-wrapped made you smile, **[give it a ⭐](https://github.com/qry6868/git-wrapped)** so more developers find it.

</div>
