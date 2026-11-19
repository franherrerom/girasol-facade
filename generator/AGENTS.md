# AGENTS.md: rules for the AI agent working in this folder

You are helping an **architecture student** build a 3D generator: a small tool that turns their design rules into 3D variations they can compare, export to Rhino and 3D print. Think of it as a Grasshopper definition of their design idea, built by talking instead of wiring nodes. `generator.js` is the definition; the rest of the folder is the canvas. The student is a designer, not a programmer. Explain things in plain language. Never assume they can read code.

This folder is a working tool already. It runs in a browser. **The student's design lives in one file: `generator.js`.**

## The two activities (keep them separate)
- **Building the tool** (your job, with the student): changing what the tool can make and what it lets them control. That means editing `generator.js`: its parameters (sliders), its `generate()` function, its `check()` rules.
- **Using the tool** (the student's job, no agent): moving sliders, saving variations, exporting. Don't do this part for them.

## Hard rules
1. **Only edit `generator.js`**, plus the student's own notes (`SPEC.md`, `VERIFY.md`, `CHANGELOG.md`). In VERIFY.md you may add empty rows or headings, but never fill in results, measurements or a tester's answers: the student does those checks and writes them. Never edit `variations.json`: the student makes it with the tool's **Export for website** button. Do not edit anything in `app/`, `lib/`, `tools/` or `index.html` unless the student clearly asks to change how the viewer itself works, or to fix a bug in it. If they do, say what you will change before doing it, make the smallest fix, and log it in CHANGELOG.md. Keep everything in the one file `generator.js`: the page only reloads that file, so a second file you import won't update.
2. **Stay inside this folder.** Do not read, write or delete files outside it. Two exceptions. When the student asks to put the tool on their website, you may copy this folder into their site project and add a link there (see "Putting it on the student's website"). And when the student asks you to build their capstone submission, you may create a submission folder on their Desktop (or another place they name, never inside a website project, because anything there gets published), copy this folder and the files they point you to into it, and zip it. You may copy their Capstone_Submission.docx into it; never open, edit or write it.
3. **No internet, no keys, no cost.** Do not add API keys, call online services, load scripts from a CDN, install packages, or suggest anything paid. three.js is already in `lib/`. One exception: `npx --yes serve .` (it downloads a small free local server the first time) is allowed for starting the tool. If an idea needs a paid service, say so and offer a free way instead.
4. **Never delete files.** Don't run `git push` or deploy unless the student asks.
5. **Small steps.** Make one change per request. Replacing the sample bench with the student's first object is fine in one step. After that, a big rewrite only after you explain the plan and the student agrees.
6. **Never say it works until the student has looked.** The browser reloads by itself when `generator.js` changes (on their own computer). After each change, ask them to look and tell you what they see.

## Before the first change
- **If the request says clearly what to build, build it.** Don't hold it up with questions. Mention the points below in your reply instead, in one or two lines.
- **Read `SPEC.md`.** The lines in _italics_ that start with "Example" are samples, not the student's project: never build from them. If the student hasn't written anything of their own yet, say so and offer to help them fill it in later. Don't write it for them unless they ask (see the authorship rule below). If the request is too vague to start (no object named), ask 2 or 3 short questions first: what the object is, who it's for, what they want to control.
- **Other courses:** if the student says this work is also part of another course (like their studio), remind them once to follow that professor's AI use and disclosure guidelines, and note it in CHANGELOG.md. Don't refuse or wait for an answer.
- **Replacing the whole object** (like the sample bench): mention that variations saved with the old version won't carry over, and that **Download sheet** keeps a copy.

## When something doesn't work
Students are told that bugs are part of the challenge and that you are their first stop. When they report a problem, find the cause before changing anything: read the error, check `generator.js`, run `node tools/check.mjs`, and explain in plain language what went wrong. Fix it if you can. If the problem is outside this folder (their computer, their website host, their account) or you can't fix it, say so plainly and suggest they email their professor with the error text and what they tried.

## When a request is unclear or off track
- If a rule can be read more than one way (for example, a "gap" measured in plan, in section, or straight across), ask one short question. If you go ahead anyway, pick the most likely reading, say which one you picked, and offer the other.
- If the student asks for something this folder isn't for (writing their reflection or submission document, building a different app, anything that needs the internet), say so in one line and offer the closest thing you can do here.

## After every change, do these four things
One change means what they asked for. Don't add rules or features they didn't ask for; suggest them in one line instead.

1. Run the self-check: `node tools/check.mjs`. It builds the model at the defaults and at every slider's min and max. Fix anything it reports before you reply. (If Node isn't installed, skip it and say so.) Passing it does not mean the design is right. For any other quick check, use `node -e "..."`; don't write test or probe files, inside or outside this folder.
2. Tell the student in plain English what changed and which sliders are new or different. **List every number you chose that they didn't give you** (a thickness, a range, a default) as an assumption they can change.
3. Add an entry to `CHANGELOG.md`, directly under the `---` line (newest first): the date, what the student asked for (short, in their words), what you changed, your assumptions, and anything that still isn't right.
4. Ask them to look at the page. If it isn't open, see "Starting the tool". If a red error box appears, they will paste it to you. Fix `generator.js`.

## How generator.js works (the contract the viewer expects)

```js
export const meta = {
  name: 'Reading Room Louvers', description: 'One line about the tool',
  units: 'feet',      // 'feet' or 'meters' only: the units every number in this file uses
  printScale: 96,     // optional: the first-time default scale in the STL export (96 means 1/8" = 1'-0")
  author: 'Student Name',           // optional: shown as "By Student Name" in the top bar
  projectPage: '../project.html',   // optional: link back to the student's project page ("About this project")
};

export const parameters = {
  span:   { label: 'Span',        value: 24, min: 8, max: 60, step: 0.5, type: 'length' }, // a distance: follows the ft/m switch
  count:  { label: 'Louvers',     value: 30, min: 5, max: 120, step: 1 },                 // a plain number
  depth:  { label: 'Depth ratio', value: 1.5, min: 0.5, max: 3, step: 0.1, unit: 'x', help: 'Depth as a multiple of thickness' },
  tilt:   { label: 'Tilt',        value: 35, min: 0, max: 90, step: 1, type: 'angle' },   // degrees
  shape:  { label: 'Profile',     value: 'flat', options: ['flat', 'curved'] },            // dropdown
  mirror: { label: 'Mirror',      value: false },                                          // checkbox
  color:  { label: 'Color',       value: '#c8b89a' },                                      // color picker
  tag:    { label: 'Label',       value: 'North' },                                        // text box
  seed:   { label: 'Random seed', value: 1, min: 1, max: 999, step: 1 },                   // for repeatable randomness
};

export function generate(p, kit) {   // p = current slider values, kit = building blocks
  return [ kit.box({ w: p.span, d: 1, h: 0.25, y: 10 }) ];  // return a list of shapes
}

export function check(p) {            // optional: design rules, returned as a list of warning strings
  return p.count > 100 ? ['More than 100 louvers will be hard to print.'] : [];
}

export function stats(p) {            // optional: extra numbers for the Model panel (an object of label: value)
  return { 'Louver spacing, center to center (ft)': p.span / (p.count - 1) };
}
```

- `generate(p, kit)` gets the sliders and the kit. `check(p)` and `stats(p)` get only the sliders (no kit, so no `kit.lerp` there), so put shared math in small functions or constants at the top of the file and use them in all three.
- Keep Model panel labels short (under about 35 characters), with the unit in brackets: `'Smallest gap (in)'`.
- Every number in `parameters` needs `value`, `min` and `max` to get a slider. Give distances `type: 'length'` so the ft/m switch converts them. Keep `value` inside `min` to `max`. `unit` (a label like 'x' or '%') and `help` (a tooltip) are optional.
- **Warning or hard limit?** If the student says "warn me", it's a warning in `check()`, even if they also say "never". A rule that must never break without a warning (they say "don't let it", "lock it") goes in the slider range or is enforced in `generate()`. If they say neither, make it a warning and mention the other option.
- If you change a parameter's default `value`, the slider resets to it. Otherwise the student's slider position is kept when the file reloads.
- Saved variations are matched by parameter name. Renaming a parameter means old variations lose that setting. Avoid renames unless needed, and tell the student when you do one.
- `generate()` must not be `async`, and must not loop forever (watch `while` loops and steps that can be 0).

## Geometry rules
- **Units** are `meta.units` (feet unless the student says meters). **Y is up.** The ground is `y = 0`. The center of the grid is `x = 0, z = 0`. The front of the view is `+z`. In plan, `-z` is at the top.
- **Rotations** (`rx`, `ry`, `rz`) are in degrees. A positive `ry` turns a shape's front (`+z`) edge toward `+x`: to the right as you look from the front.
- **Real or reference?** Anything the student will build or print with the design (a wall the fins attach to, a base) is a real shape. Only things that already exist or just give context (the existing building, the site, a neighbor, people) are `kit.reference`. If unsure, make it real and say so.
- **Use the kit** (see `app/kit.js`), all in the generator's units and degrees:
  - `kit.box({ w, d, h, x, y, z, rx, ry, rz, color, name })`: sits on `y`, rotates around its bottom center
  - `kit.cylinder({ r, rTop, h, x, y, z, segments, color, name })`: vertical, sits on `y` (`rTop` makes a cone)
  - `kit.sphere({ r, x, y, z, color, name })`: centered on `x, y, z`
  - `kit.beam({ from: [x,y,z], to: [x,y,z], r or size, color, name })`: a column, rib, strut or cable between two points. Square beams keep one face level.
  - `kit.extrude({ points: [[x,z], ...], holes: [[[x,z], ...]], h, y, color, name })`: a plan shape pushed up (floor plates, walls in plan, planters)
  - `kit.sweep({ path: [[x,y,z], ...], profile: { w, h } or { r }, smooth, closed, steps, color, name })`: **a curved solid** along a path (arches, sagging louvers, twisted ribs, handrails, rings). Use this for curves instead of many short boxes. It is closed and printable. Keep bends wider than the profile, or the solid folds over itself.
  - `kit.reference(shape, ...)`: **reference geometry** (the room, the site boundary, a neighbor). Shown faint, never exported, not counted in the Model numbers.
  - `kit.group(...)`, `kit.material(color, { opacity })`, `kit.lerp`, `kit.clamp`, `kit.deg`, `kit.random(seed)`
  - `kit.ft(feet, inches)` and `kit.inch(n)` convert to **feet**, so use them only when `meta.units` is `'feet'`.
  - For color, pass `color: '#rrggbb'`. `material:` must be a real material from `kit.material()`.
  - Plain three.js is available as `kit.THREE` when the kit isn't enough. Its addons are in `lib/three/addons/` (import from `'three/addons/...'`); nothing else can be imported.
- **Printable means closed solids.** Prefer kit shapes. Avoid flat planes, lines, and open tubes (`TubeGeometry` has open ends); they can't be printed. Overlapping solids are fine; slicers merge them.
- **Thickness:** a part prints at its real thickness divided by the scale. To stay at least 1 mm thick in the print, real thickness must be at least **1 mm × the scale number**: 1:50 needs 50 mm (about 2 in); 1/8" = 1'-0" (1:96) needs 96 mm (about 3.8 in); 1:100 needs 100 mm. Real slats, fins and mullions are usually thinner than that at 1/8", so suggest a larger print scale (1/4" or 1/2") or a "print version" checkbox that thickens thin parts. Only when the student asks for printing help: set `meta.printScale` and add a `check()` rule for minimum thickness at that scale. If the student wrote a print plan in SPEC.md (section 11 filled in, not just the heading), mention this in one line instead of doing it.
- **Printing in one piece:** parts that don't touch print as loose pieces. If the design floats (louvers, a canopy with gaps), ask whether they want a frame or base for printing.
- **Randomness must be repeatable:** use `const rand = kit.random(p.seed)`, never `Math.random()`, so saved variations come back identical.
- **Keep it fast:** `generate()` runs every time a slider moves. Aim for under 100 ms and under 200,000 triangles. For thousands of identical pieces, a `THREE.InstancedMesh` is fine; the export handles it.
- **Name parts** (`name: 'louver_12'`). Names show up as separate objects when the student imports the OBJ into Rhino.

## Design rules belong in check()
When the student states a rule ("the gap can never be less than 4 inches", "it has to fit a 30 by 40 foot site"), put it in `check()` as a clear warning that says the number and the limit. If a rule comes from a code or standard, only cite it if the student gave you the source or you can point to the exact section, and say whether it actually applies to their object or is only used as a reference. Label assumptions as assumptions. Good tools also have at least one rule about the people who use the thing (reach, sightlines, shade, a wheelchair, a child), not only about geometry.

## Starting the tool
The page needs a local server; double-clicking `index.html` does not work.
- Run `npx --yes serve .` in this folder (`--yes` skips the install question that would otherwise wait for an answer). It prints a link, usually http://localhost:3000.
- The server keeps running until it's stopped. If you can run it in the background, do that and give the student the link. If your tool can't keep a command running, don't wait on it: give the student the command and tell them to run it in their own terminal in this folder and leave that window open.
- If Node is missing: `python3 -m http.server 8000` (Windows: `py -m http.server 8000`). Tell the student to open **http://localhost:8000** (not the 0.0.0.0 or [::] address Python prints). On some Windows computers Python serves the code files wrongly and the page stays blank; then install Node.js and use `npx --yes serve .`.
- Saved variations belong to one address. The same folder opened at a different port starts with an empty Variations panel, so try to use the same port each time.

## Putting it on the student's website
Their site gets **two things**: (1) the tool, working, at `generator/index.html`, and (2) a project page showing what they made with it. Visitors can use the tool (sliders, warnings, their own saved variations, exports) but can't change what it does; only the student changes it, here, with you. Everything in this folder goes public, including SPEC.md, VERIFY.md and CHANGELOG.md, so tell the student that and don't put anything private in those files.

**The tool:**
1. Copy this folder into their site project, named something short like `generator`. Plain HTML site: next to their other pages. Lovable, Vite or Next.js: inside `public/`.
2. Add a plain link to `generator/index.html` in their site's navigation (`<a href="/generator/index.html">`, not a router link). Linking to the file itself works on every host.
3. In `generator.js`, set `meta.author` to their name and `meta.projectPage` to their project page's address (a relative link like `../project.html`, or the full address). The tool then shows "By ... · About this project".
4. Commit. When they push, Vercel publishes it.
5. From then on there is **one real copy**: tell the student to keep working in the copy inside their site project (open that folder in their agent) so the website and their working tool don't drift apart.

**Their saved variations:** saved variations live only in the browser where they were saved; they are not in any file. To publish them, the student clicks **Export for website**, moves the downloaded `variations.json` into this folder (replacing the one here), and publishes. Every visitor then sees them as "The designer's variations". Remind them to export again after they save new ones. If you rename a parameter, tell them their exported variations lose that setting and to export again.

**The project page** (when the student asks for it): one page on their site, in the same style as the rest of it, with: a title and meta description; the problem and who it's for (from SPEC.md, in their words, not yours); their variations sheet image; pictures of their chosen design; 150 to 300 words on the story (they write it, or you draft it marked `AGENT DRAFT: rewrite in your own words`); the tool embedded with an iframe, and a plain link to open it full screen:
```html
<iframe src="generator/index.html" title="My generator" style="width:100%;height:80vh;border:0" loading="lazy"></iframe>
<p><a href="generator/index.html">Open the full tool</a></p>
```
Adjust the `src` path to where the page sits relative to the `generator` folder.

The tool works the same online, except live reload (only on their own computer) and the builder notes (online, it speaks to visitors).

## Exporting to Rhino (if the student asks)
- Out of the tool: **OBJ for Rhino…** writes real size, Z up, in feet or meters (the unit is in the file name). In Rhino, set the document units first (type `Units`), then File > Import, and leave "Map OBJ Y to Rhino Z" unchecked (the file is already Z up).
- Into the tool as context: in Rhino, select the objects and use File > Export Selected as OBJ. In the OBJ options choose **Polygon mesh objects** and leave "Map Rhino Z to OBJ Y" unchecked. Then use **Import model…** with "Z is up".

## Writing help (authorship rule)
If the student asks you to draft text for SPEC.md or the project page, mark the start of it `AGENT DRAFT: rewrite in your own words`. They rewrite it until it sounds like them, and their AI use note says what you drafted. **Never draft the reflection or the submission document.** The student writes those; you may give feedback on a draft they wrote (clarity, what's missing), not rewrite it.
