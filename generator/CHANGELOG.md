# CHANGELOG: how my tool was built

Your agent adds an entry after every change, directly under the `---` line (newest first). You can add notes too. This is your evidence of the build, so keep it honest: include what didn't work.

Format:

## YYYY-MM-DD: short title
- **I asked for:** (your words)
- **What changed:** (plain English, which sliders or rules)
- **Assumptions:** (numbers the agent chose that you didn't give)
- **Still not right:** (if anything)

---

## 2026-11-19: Any surface, three module shapes, one sun rule
- **I asked for:** Other kinds of facades (curves, skyscrapers) to show it works on any surface; module shapes that open and close with the light in the same theme; on every surface, work out the sun on that side, fully open where it hits 100%, closed where it doesn't, consistent everywhere.
- **What changed:** New sliders Building form (flat, curved, wave, sloped wall, round tower, square tower), Module shape (triangle, diamond, hexagon) and Facing. Floors now go to 24. Every module now reads the sun on its own face: open in direct sun, closed in shade. This replaces the old rule that opened the whole skin by the sun's height. Rules and numbers (view hole, clear view, day catch, leaf reach) now work for every shape and form. New numbers: Modules in full sun now, Modules open now.
- **Assumptions:** Fully open when the sun is within about 60 degrees of straight on (cosine 0.5); closed below about 84 degrees (cosine 0.1); smooth in between. Curved wall bends 100 degrees; wave wall waves 3 times, 1/24 of the width deep; sloped wall leans back 20 degrees; square tower has rounded corners. On towers, Width is the diameter and modules stretch a little so the ring closes. Towers have a core and a ring of columns; curved walls have straight backs. The eye-level band still keeps those modules at least that open.
- **Still not right:** One part of the building shading another (the wave's folds, a tower's far side) is not counted. Opening the leaves when the sun hits squarely tilts them away from it, so the energy rule now warns in March and December: open-in-the-sun looks like a sunflower but catches less than staying shut. Big hexagons break the leaf-reach rule unless the module side is smaller. The print version only prints flat on the flat wall.

## 2026-11-19: Print version prints flat
- **I asked for:** An STL to 3D print my object.
- **What changed:** With Print version on, the tool now keeps only the skin (frames, leaves and diagrid), so it prints flat with the diagrid on the bed. Leaves are a little thicker (about 1.1 mm at 1/8" = 1'-0").
- **Assumptions:** Slabs and V columns are left out of the print. A smaller piece of the facade (48 ft by 3 floors) is the quick print.
- **Still not right:** The thinnest parts are close to 1 mm, so I need to check them in the slicer.

## 2026-11-05: SPEC updated from my answers
- **I asked for:** Rewrite the SPEC from my quick answers.
- **What changed:** I chose what I want to find out (does it really give energy), the slider I care about most (eye-level band), my main rule (the 6 in hole) and who it serves worst (people looking at an angle). The note at the top of SPEC.md now says how it was written. No change to generator.js.
- **Assumptions:** None new.
- **Still not right:** The rest of the wording is still mostly Claude's. The rule does not check angled views yet.

## 2026-11-05: SPEC draft for the checkpoint
- **I asked for:** Get the SPEC ready for the Canvas checkpoint.
- **What changed:** SPEC section 1 now says why the skin needs many versions. Section 9 says the tool's energy estimates are far below my site's concept figures. No change to generator.js.
- **Assumptions:** None new.
- **Still not right:** The SPEC is still an agent draft until I rewrite it.

## 2026-11-05: Rule 4: leaf reach
- **I asked for:** Add the maintenance rule: leaf tips never reach more than 1.5 ft past the frame.
- **What changed:** Warning when the leaves reach further. New Model number: Leaf reach.
- **Assumptions:** 1.5 ft is a number Claude proposed; I should check it with someone who knows window-cleaning rigs.
- **Still not right:** I still have to look at the page.

## 2026-11-05: Rule 3: the skin must beat a flat skin
- **I asked for:** Add the energy rule. Claude first drafted "at least 2 times a flat skin", then found it could not be met outside June, so the rule is now "at least 1 time".
- **What changed:** Warning when a clear day in the chosen season catches less than a flat closed skin. New Model numbers: Day catch, Clear-day energy, Best-case module.
- **Assumptions:** Cells cover 52% of a leaf and are 20% efficient. Direct sun comes from a rough clear-sky formula. Sun time, not clock time.
- **Still not right:** Leaves shading each other is ignored, so open settings look better than they are. These numbers are far below the figures on my website (180 W a module, 1,150 kWh a day, 2.6 times a closed skin). I need to decide what to do about that.

## 2026-11-05: Rule 2: clear view at eye level
- **I asked for:** Add the second rule: at eye level at least 25% of the facade is clear.
- **What changed:** Warning when under 25%. New Model number: Eye-level clear view.
- **Assumptions:** 25% is a number Claude proposed, not one from a standard. Measured straight on; the frame counts as blocked.
- **Still not right:** I still have to look at the page.

## 2026-11-05: Rule 1: view hole at eye level
- **I asked for:** Add the first rule from SPEC section 6: the clear hole at eye level is never under 6 in.
- **What changed:** Warning when the hole in the eye-level modules is under 6 in. New Model number: Eye-level view hole.
- **Assumptions:** The hole is the circle at the center of a module, measured straight on. It does not check an angled view.
- **Still not right:** I still have to look at the page.

## 2026-11-05: Replaced the bench with the Girasol skin
- **I asked for:** "Explain it and do it", using my Girasol Facade. Claude picked the sliders and drafted SPEC.md; I still have to rewrite it.
- **What changed:** New generator: triangular modules, three leaves, solar cells, diagrid, floor slabs and V columns. Sliders for width, floors, module side, bay size, opening, eye-level band, time of day and season, plus Follow the sun and Print version. Geometry comes from js/model.js on my site.
- **Assumptions:** 48 ft building depth (the same stand-in as my site). Slider ranges. V columns every 24 ft. Slab edge 6 in behind the skin. Leaf and frame thickness in the print version.
- **Still not right:** I still have to look at the page.

## Starting point
- **What changed:** Started from the Generator Starter with the sample park bench.
