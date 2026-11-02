# Changelog

## Unreleased

- New page, **Things you might not have noticed**: the quirks of your year, such as commits after 6 PM on a Friday, fixes in a row, reverts, your longest session and commits on holidays. Only the ones that stand out are shown.
- **Every personality and AI style has its own badge** instead of an emoji, in a flat, print-poster style: a character built from simple shapes, peeking over **your own number** (your latest commit, your streak, your fixes…), so no two people's badges are the same. On the report they move (the owl blinks and follows your pointer, the clock runs, the robot in headphones nods along); on the posters and stats cards they stand still, and they look the same on every system.
- **The personality reveal is a moment now**: every personality's badge spins past like a slot machine, slows down and lands on yours, with a burst of light, the name rising letter by letter and, with the soundtrack on, a chime.
- Every page fits on one screen on small phones (360×640 and up).
- The wide poster shows your name.
- The report and share text say "coding recap" / "Coding 年度报告", matching the posters.

## 0.3.0

**[See it live](https://qry6868.github.io/commitale/)**: a full report on sample data, nothing to install.

### Share cards

- **New poster style**, after the year-in-review posters people actually post: a big "My 2026 coding recap" title, your personality on a full-width color block, the fact that earned it ("38% of my commits landed between 10 PM and 5 AM"), your AI style, your year drawn as a waveform with month labels, what you shipped, your top languages, and a row of headline numbers.
- Posters and stats cards both come in wide, square and story sizes. Pick a style and size on the last page of the report.
- **Share cards never show repo names or commit messages.** The report you keep still does.
- Your AI style now sits beside your personality on every card.
- Two display fonts (Space Grotesk and Anton, both SIL Open Font License) are built in, so cards look the same everywhere, PNG downloads included.

### Report

- A mellow soundtrack, synthesised live in your browser. It starts on your first tap; the button in the corner turns it off.
- The AI pages come earlier, right after your commits. Your AI style now comes from the total tokens you spent this year.
- New pages and charts: what you committed (features, fixes, refactors…), commits by month and weekday, added versus deleted lines, and a two-column summary page.
- Every animation now runs reliably, and slides fit on small phones.

### Reliability

- Clear message when git isn't installed.
- Auto-search gives up on a slow drive after 20 seconds and says so, instead of hanging.
- A repo that takes more than two minutes to read is skipped and named.
- Very large AI usage logs (over 512 MB) are read in full, instead of silently skipped.

## 0.2.0

- AI usage page from your local Claude Code and Codex logs (token counts only; prompts and code are never read), with five AI styles.
- Year-over-year comparison, personality color themes, square and story cards, and a tap-through story report.
- With no folder given, Commitale finds your repositories on its own.

## 0.1.x

- First release as Commitale (renamed from git-wrapped), with a step-by-step quick start and troubleshooting guide.
