# SPEC: my generator

**What this is:** the brief for your tool. You're building a Grasshopper definition of your own design idea, by talking to your agent instead of wiring nodes. This file is where you decide what that definition does. Your agent reads it before every change.

Write it **before** you start building, in your own words. Keep it short. Update it when your idea changes.

When you put the tool on your website, this file goes public with it. Don't put anything private here.

---

## 0. How to pick what to build
**Pick the part of your project you keep redrawing or changing.** That's your generator. Ask yourself:
- What part of my design do I keep changing, sketch after sketch?
- What has to stay true no matter how I change it?
- If I could see 20 versions side by side, what would I compare?

Examples: a canopy, a facade screen, a folded enclosure, a truss, a roof and its overhangs, skylights, a stair, a unit layout. Massing is one option, not the assignment.

---

> Claude drafted this SPEC from my Girasol files and my answers to its questions. The decisions in it (who it's for, the rules, the eye-level band, the 6 in hole) are mine.

## 1. What it is
The solar skin of my Girasol Facade: triangular modules with three leaves that open toward the sun, on a south-facing facade in Miami. The tool sizes the skin and sets how far it opens, so I can compare versions instead of redrawing them. My website shows one fixed version; I never tested other module sizes or openings. What I most want to find out is whether the skin really gives energy. It needs many versions because the answer changes with the season and the hour: an opening that sees out well in March can cost energy in December.

## 2. Who it's for
The people working on the floors behind the skin, who need to see out. The building owner, who wants the skin to make real energy. The crews who maintain 1,000 moving parts. I'm also designing for myself: I want to know what the skin can honestly do.

## 3. Other courses
- [x] This is only for this course.
- [ ] This is also part of another course (which one: ______). I'm following that professor's AI use and disclosure guidelines there.

## 4. What can change (your sliders, at least 4)

| Slider | What it changes | From | To | Units | Why it matters to the design |
|---|---|---|---|---|---|
| Building form | The surface the skin wraps: flat, curved, wave or sloped wall, round or square tower | - | - | - | Shows the skin works on any surface, not only one flat wall |
| Module shape | Triangle, diamond or hexagon, one leaf per side | - | - | - | Same idea, different pattern; bigger shapes see out more but leaves reach further |
| Facing | Which way the building turns | -180 | 180 | degrees | 0 is south; turning it changes which faces get sun |
| Facade width | The wall the skin covers (the diameter on a tower) | 48 | 120 | ft | From a mid-block building to a full frontage |
| Floors behind the skin | How tall the skin is | 3 | 24 | floors | My building has 6; towers go higher; taller means more motors |
| Module side | The size of every triangle | 3 | 8 | ft | Small reads as fabric but the view hole shrinks; big sees out but leaves reach further |
| Bay size | Modules between diagrid lines | 2 | 8 | modules | The diamond pattern and the size of a panel |
| Opening in full sun | How open a module gets when the sun hits it squarely | 5 | 100 | % | More open sees out; too open stops catching sun |
| Eye-level band | Opening of the modules where people look out | 5 | 100 | % | A band can stay open while the rest of the skin works for energy |
| Time of day | Where the sun is | 6 | 18 | hours | The skin follows the sun, so this changes the design |
| Season | June, March or December | - | - | - | Miami's sun is overhead in June and low in December |

The slider I care about most is the eye-level band, because it keeps a line of the skin open for people even when the rest closes.

Open with the sun is a checkbox: when it's on, every module reads the sun on its own face. Where direct sun hits it squarely it opens all the way to the Opening; where it is in shade (or the sun is behind it) it closes. It is the same rule on every surface. Only the eye-level band can keep a module more open than that. Print version is a checkbox that thickens thin parts.

## 5. What stays fixed
Miami (latitude 25.8); the facade faces south unless I turn it with Facing. Floor-to-floor is 13.7 ft (96 ft over 7 storeys). Ground floor is glazed; the skin starts above it. Every module is a regular shape (triangle, diamond or hexagon) with a frame, one hinged leaf per side and solar cells on the leaves. A module counts as in full sun when the sun is within about 60 degrees of straight on (assumption), and as in shade below about 84 degrees. Leaves open up to 72 degrees. Building depth is 48 ft (a stand-in; I haven't designed it).

## 6. What must stay true (your rules)
1. **People rule, view (the one that matters most to me):** at eye level (3 to 7 ft above each floor), the clear hole you see through a module is never under 6 in. Seated eye height is about 4 ft.
2. **People rule, view:** at eye level, at least 25% of the facade is clear, seen straight on.
3. **Energy:** over a clear day in the chosen season, the skin catches at least as much sun as the same surface with every module closed (1 times or more). My first draft said 2 times; the math showed that only happens in June.
4. **People rule, maintenance:** leaf tips never reach more than 1.5 ft past the frame, so a window-cleaning rig can pass.

## 7. What a good variation looks like
You can see out from a desk, the skin passes the energy rule in the chosen season, and the eye-level band reads as a deliberate line on the facade, not an accident.

## 8. Who it does not serve
Most of all, anyone looking out at an angle: the 6 in hole is measured straight on, and it looks narrower from a desk off to one side. My main rule doesn't check that yet. Someone in a wheelchair or a child has a lower eye height than the band may suit on some floors. At night, or when the skin closes, nobody sees out. The neighbors across the street could get glare off 1,000 moving panels, and the tool doesn't measure that. People who maintain it have thousands of motors to keep alive, and the tool only counts them.

## 9. What my tool will NOT do
No structure, wind or hurricane loads, no cost, no heat gain or glare inside. The sun numbers are geometry only: they ignore clouds and leaves shading each other, so they're estimates. It doesn't model the inside of the building. The estimates are also far below the concept figures on my website (about 40 W against 180 W a module, and about 85 kWh against 1,150 kWh on a clear day), and those site figures were invented for the concept. The tool reports its own numbers, not the site's.

## 10. References and context
My Girasol Facade website (girasol-facade.vercel.app) and its model, DESIGN.md and SPEC.md. My own elevation, module and exploded axon drawings.

## 11. Print plan (optional, +5 bonus)
Maybe 1/8" = 1'-0" (about 267 mm wide), with the Print version checkbox on. A smaller crop of the facade at a larger scale could show the leaves better.

---

## Your first prompt, once this is filled in
> Read AGENTS.md and SPEC.md. Replace the bench with my [object from section 1]. Start simple, with the sliders in section 4 and the fixed numbers in section 5. Don't add the rules yet.

Then add the rules from section 6, one at a time.

## Checkpoints
- [ ] **Nov 5, 5:05 PM:** this SPEC on Canvas, as a draft (doesn't have to be final), plus a 90-second share in class
- [ ] **By Nov 19, 5:05 PM:** my finished tool and project page live on my site (publish a few days early; email by Mon Nov 16 if it won't load)

## Done when
Due Thursday Nov 19, 5:05 PM: one zip on Canvas with this folder, your submission document (links and reflection), your sheet, STL and OBJ. See worksheet section 5.

- [ ] The tool is live on my site and has at least 4 sliders I designed
- [ ] I saved at least 6 variations and downloaded the sheet
- [ ] I chose one and refined it, and exported STL and OBJ
- [ ] My BA2 reviewer or BA3 jury critiqued it, and I changed something because of it
- [ ] At least one of my rules (the warnings) is about the people who use it, not only geometry
- [ ] Someone outside the class (ideally an architecture student) tested my tool by Nov 16; VERIFY.md has their task, their answers and what I changed
- [ ] VERIFY.md has 3 checks
- [ ] CHANGELOG.md shows how the tool was built
- [ ] The project page is on my site
- [ ] My reflection (500 to 800 words) has a "Who it does not serve" section and an AI use note
- [ ] My 5-minute pitch is to an audience I chose, shows the tool live, and ends with an ask
