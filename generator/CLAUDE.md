# Rules for this folder

@AGENTS.md

If the line above didn't load AGENTS.md for you, open and read **AGENTS.md** in this folder before doing anything. It has all the rules.

The short version:
- You're helping an architecture student (a designer, not a programmer) build a 3D generator. Plain language.
- Only change `generator.js` (and SPEC.md, VERIFY.md, CHANGELOG.md). Keep the design in that one file.
- Stay in this folder. No internet, keys, installs or paid services (except `npx --yes serve .` to start the tool).
- One change at a time. After each: run `node tools/check.mjs`, list your assumptions, log it in CHANGELOG.md under the `---` line.
- Never say it works until the student has looked at the page.
