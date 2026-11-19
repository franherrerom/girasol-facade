# Generator Starter
ARC 585/685 "Human Centered AI for All" · Capstone: Build the Tool Your Project Needs

**You're building a Grasshopper definition of your own design idea, by talking to your agent instead of wiring nodes.**

> You're not just modeling an object. You're designing the rules that generate it.

## What this is

| In Grasshopper | Here |
|---|---|
| The Rhino viewport | This folder: 3D view, sliders, saving, exports. The same for everyone. You don't change it. |
| Your definition | `generator.js`. **This is your tool.** |
| Number sliders | The sliders you ask for |
| Wiring the logic | Telling your agent your rules, in plain English |
| Bake to Rhino | OBJ for Rhino |

`generator.js` holds three things:
1. **What the object is:** a canopy, a facade screen, a truss, a stair.
2. **What can change:** the sliders, and how far each one goes.
3. **What must stay true:** your rules. When one breaks, the tool warns you.

**The bench is a placeholder.** It's there so you can check the tool works on your computer and see what a finished definition looks like. Your first prompt replaces it. It has nothing to do with your project.

**You don't code.** Your agent writes the code. You decide everything it does, and you check that what appears is what you meant.

## Pick what to build
**Pick the part of your project you keep redrawing or changing.** That's your generator. Ask yourself: what do I keep changing? What has to stay true no matter what? If I could see 20 versions side by side, what would I compare?

| If your project has... | Your generator could be | Sliders (at least 4) | A people rule |
|---|---|---|---|
| A shade structure or pavilion | Canopy generator | length, width, column grid, roof height | headroom never under 8 ft |
| A folded or faceted enclosure | Fold generator | length, height, number of folds, opening size | at least one opening at seated eye level (about 4 ft) |
| A timber or steel truss | Truss generator | span, depth, number of bays, member size | clear headroom under the bottom chord at least 8 ft |
| Housing units | Unit stacking generator | units per row, floors, unit width, unit mix | every family unit has an accessible ground floor |
| A facade | Screen or fin generator | facade width, fin count, depth, rotation | the gap you see out of never under 6 in |
| A passive-cooling house | Roof and shading generator | roof pitch, overhang, window width, window height | every window sill under 3 ft so seated people see out |
| No project you can use | Anything real you'd build | a bus-stop canopy, a shelf, a balcony screen | graded exactly the same |

More examples are in the capstone worksheet. Rules are things the tool can measure (distances, heights, counts, angles, areas); it doesn't simulate wind, structure or daylight.

**Your studio project, or any real thing you'd design and build, needs no permission.** If your idea isn't part of a building or design project, or you want to turn this tool into something wildly different, email your professor first (by Mon Nov 2) for approval and guidance.

Massing is one option, not the assignment. Write your choice in `SPEC.md` first; that's where you decide what your definition does.

---

## Start in 4 steps

1. **Unzip** this folder somewhere easy to find (Desktop or Documents). Rename it if you like, e.g. `my-generator`.
   - **Windows:** right-click the zip > **Extract All**. Open the result: if you see another folder with the same name inside, that inner folder is the real one (it's the one with `index.html` in it). Use that one.
   - **Mac:** double-click the zip.
2. **Open the folder in your agent**: Codex (the desktop app or the CLI, not ChatGPT in the browser), Claude Code or Gemini CLI, the same way you did for BA4 and BA5.
3. **Start the tool.** Ask your agent: *"Read AGENTS.md. Then start a local server for this folder and give me the link."*
   Or do it yourself in a terminal opened in this folder:
   - **Open a terminal here.** Windows 11: right-click inside the folder > **Open in Terminal**. Windows 10: click the folder's address bar, type `cmd`, press Enter. Mac: open Terminal, type `cd ` (with a space), drag the folder into the Terminal window, press Enter.
   - Type `npx --yes serve .` and press Enter. (The first time it downloads a small free server.)
   - It prints a link, usually **http://localhost:3000**.
   - **Leave that terminal open** while you work. Closing it stops the tool. To stop it yourself, press Ctrl+C. Next time you work, start it again the same way.
4. **Open the link in Chrome, Edge, Safari or Firefox.** You should see the bench. Move a slider. If the bench moves, you're set.

Don't double-click `index.html`; browsers block 3D code that way. The page will tell you if you do.

---

## Building vs. using

| | Building the tool | Using the tool |
|---|---|---|
| With | your agent | the sliders |
| You are | deciding what it can make and what it lets you control | making and comparing variations |
| Example | "Add a slider for louver spacing. Warn me if the gap goes under 4 inches." | 6" spacing vs. 12", steep vs. flat |

They loop: using it shows you what it can't do yet, so you go back and build that in.

**Keep the page open while your agent works.** On your own computer the page reloads by itself every time `generator.js` changes ("Live reload on" in the corner).

---

## Your first prompts (adapt them; use PREPA)

1. *"Read AGENTS.md and SPEC.md. Replace the bench with my [object from SPEC section 1]. Start simple, with the sliders in section 4 and the fixed numbers in section 5. Don't add the rules yet."*
2. *"Add the first rule from SPEC section 6: [the rule, with the number]. Warn me when it's broken."*
3. *"When I move [slider], [this] happens, but I wanted [that]. Fix it."*
4. *"Here's a sketch of the idea (attach image). Make the form follow it."*
5. *"Add a [new parameter] that changes [what], from [min] to [max]."*

Give real numbers whenever you have them. Every number you leave out, the agent guesses (it lists its guesses so you can change them). One change at a time works best. Look at the page after each one.

**If a red box appears:** click **Copy error for my agent** and paste it to your agent. The last working version stays on screen, so nothing is lost.

---

## What's in the folder

| File | What it is | Who changes it |
|---|---|---|
| `generator.js` | **Your tool.** Parameters, the form, your rules | You and your agent |
| `SPEC.md` | Your tool's brief. Write it first | You |
| `VERIFY.md` | Your testing record: 3 hand checks, pressure test, fresh eyes test | You |
| `CHANGELOG.md` | The record of how you built it | Your agent adds to it; you check it |
| `AGENTS.md` (+ `CLAUDE.md`, `GEMINI.md`) | Rules for your agent | Nobody |
| `index.html`, `app/`, `lib/`, `tools/` | The viewer, sliders, exports and a self-check (the plumbing) | Nobody |
| `examples/sample-context.obj` | A test site model to try Import with | Nobody |

---

## Using your studio work
- **As reference:** show your agent drawings, diagrams and model photos to explain what you want.
- **As context:** in Rhino, select what you want around your design and use **File > Export Selected**, saved as **OBJ**. In the OBJ options pick **Polygon mesh objects** and leave "Map Rhino Z to OBJ Y" unchecked. Then click **Import model…** in the tool, pick the file's units, and leave "Z is up". It shows in gray, and it's never exported. Heavy models get slow in a browser; export a simplified version.
- **As output:** **OBJ for Rhino…** gives you real-size geometry, Z up, one object per part. In Rhino, first set the document units to match the file name (e.g. `_feet.obj`; type `Units`), then File > Import with "Map OBJ Y to Rhino Z" unchecked.

Use this tool for work you're submitting in this course. If any of it is also part of another course, like your studio, follow that professor's AI use and disclosure guidelines there.

---

## Variations
- **Save variation** keeps the current slider settings plus a picture taken from the same angle.
- Click a saved one to bring it back. Hover to see its settings. You can keep 24; after that the oldest is removed.
- **Download sheet** makes one image of all of them, re-drawn at one shared scale with their settings: that's your variations deliverable.
- They're saved **in this browser, at this exact address**. Another browser, another computer, your website, or the same folder at a different port (http://localhost:3001 instead of :3000) all start empty. Download the sheet often.
- **Export for website** saves them as `variations.json`. Put that file in this folder and publish, and every visitor sees them as "The designer's variations".

## Printing (optional, +5 bonus)
- The bonus needs a **physical print** you bring to your pitch. A file alone doesn't count.
- **STL for printing…** asks for a scale (architectural like 1/8" = 1'-0", or metric like 1:100), shows the print size in mm and inches, and warns if it's bigger than a typical printer bed or has parts thinner than 1 mm.
- Real slats, fins and mullions are usually too thin to print at 1/8". Print a part of the design at a larger scale, or ask your agent for a "print version" checkbox that thickens thin parts.
- The thin-part warning is a quick check, not a guarantee. Always look at the file in your slicer before printing.
- The file is in millimeters with Z up, which is what slicers expect. Overlapping parts are normal; most slicers merge them.
- Check sizes and file rules with the Fab Lab before you print.

## Putting it on your website
Publish whenever you're ready; it has to be live and final by **Thu Nov 19, 5:05 PM**. Do it a few days early: publishing is where things break, and your fresh eyes tester may want a link. If it won't load, email me by Mon Nov 16 and say what kind of site you have. If your agent can do these steps for you, let it: just say "put my generator on my website".

Your site gets **two things**:
1. **The tool, working**, at `yoursite/generator/index.html`. Anyone can open it and use it: move your sliders, see your warnings, load your variations, save their own, export. They can't change what the tool can do; only you can, here, with your agent, and then you publish again.
2. **A project page** showing what you made with it: your variations sheet, pictures of your chosen design, 150 to 300 words on the story, and the tool itself embedded right on the page ("here's what I made, here's the tool I built to make it, try it").

**The tool:**
1. Copy this folder into your BA4 site project and name it `generator`.
   - Plain HTML site: put it next to your other pages.
   - Lovable, Vite or Next.js: put it inside `public/`.
2. Ask your agent: *"Add a plain link to generator/index.html in my site's navigation. Set meta.author to my name."* (First name or initials is fine: it shows publicly.) Once your project page exists, ask it to set meta.projectPage to that page too. The tool then shows "By you · About this project".
3. Publish the way you did in BA4 (usually: ask your agent to commit and push, and Vercel publishes it at `yoursite.vercel.app/generator/index.html`).
4. **From now on, work in the copy inside your site project** (open that folder in your agent). Two copies drift apart. If your site only lives in Lovable, ask your agent to help you clone it to your computer first.

**Your variations, published:** saved variations live in your browser, not in any file, so they don't upload by themselves. Click **Export for website**, move the downloaded `variations.json` into your generator folder (replace the one there), and publish. Every visitor then sees them under "The designer's variations" and can click any one to load it. Export again whenever you save new ones.

**The project page:** paste this into your agent:
> Make a project page for my generator, in the same style as my site, linked in my navigation. Title and meta description. Sections: the problem and who it's for (from my SPEC.md, my words), my variations sheet, pictures of my chosen design, a story section I'll write myself (leave a placeholder), and my tool embedded with an iframe plus an "Open the full tool" link. Then tell me which files you changed.

**Everything in this folder goes public**, including SPEC.md, VERIFY.md and CHANGELOG.md. Keep imported Rhino context models, your submission document and your submission zip outside it. Online the tool works the same, except live reload (only on your computer), and the builder notes are replaced with notes for visitors.

---

## Troubleshooting

**Bugs are part of the build.** When something misbehaves, ask your agent first: say what you expected and what happened, or paste the red error, and ask it to find the cause and fix it. Log the fix in CHANGELOG.md; it counts as build evidence. Still stuck after trying? Email your professor. Early is better than the night before.


| Problem | Fix |
|---|---|
| Page says it "needs a local server" | You double-clicked `index.html`. Use step 3 above. |
| Blank or broken page online | Link to `generator/index.html` (with the file name). |
| My agent changed the file but nothing happened | Wait 2 seconds. Still nothing? Refresh the page. Is "Live reload on" showing? Is the terminal running the server still open? |
| Red error box | Copy the error and paste it to your agent. |
| Sliders feel slow | Ask your agent: "generate() is slow, make it faster without changing the design." |
| My saved variations disappeared | They live in one browser at one address. Same browser, same link (same port), same computer? Download sheets as you go. |
| Imported model is huge, tiny, sideways or floating | Import again and change the units, which way is up, or Heights. Turn on Scale figure to judge size. |
| Windows says "running scripts is disabled on this system" | Type `npx.cmd --yes serve .` instead, or use Command Prompt instead of PowerShell. |
| `npx` not found | Install Node.js (nodejs.org, the LTS version) and open a new terminal. Or use `python3 -m http.server 8000` (Windows: `py -m http.server 8000`) and open **http://localhost:8000**. If that page stays blank on Windows, install Node.js. |
| The page says the browser is too old | Update your browser. |

---

Built for ARC 585/685, University of Miami School of Architecture, Fall 2026. The starter (viewer, sliders, exports) is course material shared with you for this project; you may publish it on your site as part of your tool.
Uses three.js and lil-gui (MIT licenses in `lib/`).
