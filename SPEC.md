# SPEC.md: Girasol Facade

## What it is
Girasol Facade is an interactive website for a speculative building skin made of solar modules that open toward the sun like a sunflower. The facade is shown as a real-time 3D model the visitor can play with. The site is about spectacle, not technical detail.

Audience: the general public first, and a professor reviewing it for a class. Nothing should require architecture knowledge.

The visitor should leave able to repeat: "The building follows the sun all day to make its own energy."

## Pages

### login.html (Log in)
Purpose: the front door. Never gated.
Content: the facade model full screen behind a frosted panel, modules breathing. A centred card with "Girasol", the key sentence, email and password fields, a Log in button, and a "Create account" toggle that switches the card to sign-up. Clear plain-language error messages. Footer line.

### index.html (Home)
Purpose: wonder, then control.
Content:
- On load, the facade fills the screen fully closed. Over about 4 seconds the sun sweeps in and every module opens toward it in a wave.
- About a second after the model appears, while the opening is still playing, "Girasol", the key sentence and the sun dial fade in smoothly in the top-left and bottom-left corners, followed by an annotation beside the dial: "Spin the sun" with an arrow pointing at it. Spinning the dial before the opening ends takes over straight away.
- A sun dial in the bottom-left corner sets the time of day (0 to 24 h). The visitor spins it with mouse, finger or arrow keys. Every module turns and opens to follow the sun. The background moves through the day cycle with the sun's height.
- The background never stands still: when nobody is spinning the dial, the day keeps moving on its own, about 30 seconds of daylight and 10 seconds of night. Spinning takes over; a few seconds after letting go, the day carries on from there.
- A ground line runs the full width of the page at the base of the building.
- Behind the building, a simple made-up city skyline in silhouette, tinted by the sky colour. Not a real city's skyline.
- A link at the bottom: "Watch a whole day" leading to day.html.
- Footer line.

### day.html (A Day)
Purpose: show a full day and how much energy the facade collects, through text, diagrams and animation.
Content:
- Alternating layout. Scrolling moves time from sunrise to after dark. The model and the text swap sides at each chapter.
- Chapters: Dawn, Morning, Noon, Afternoon, Dusk, Night.
- Energy is woven through every chapter: modules glow as they open, Energy-coloured light flows down the facade into the building, and a counter climbs through the day toward the daily total.
- Each chapter has one bold headline and one or two lines of text, plus a simple animated diagram where it helps (for example, energy collected open versus closed).
- At Noon, the building explodes into its layers: floor slabs on V-shaped columns, the diamond diagrid frame, a rhombus panel, a single module. Then it reassembles as scrolling continues.
- At Night, every module closes and the counter shows the day's total.
- A hint pill: "Tap a triangle." Clicking or tapping any module flies the camera into it and opens module.html with a smooth transition.
- Footer line.

### module.html (The Module)
Purpose: one triangle up close.
Content:
- A single module, free layout, full screen. Drag to rotate it.
- A slider or drag gesture opens it from 5% to 100%, with the percentage shown.
- An explode button separates it into frame, three leaves, solar cells and the small motor at each hinge, each with a short label, then reassembles.
- A few confident figures from the concept figures below.
- A link back: "Back to the day" leading to day.html.
- Reached mainly by clicking a triangle on day.html, and also from the menu.
- Footer line.

### Every page
- Top menu: the Girasol logo (links to Home), Home, A Day, The Module, Log out.
- Footer: "Girasol Facade. A speculative design concept by Francisco Herrero."

## Concept figures (declared exception)
Fran has explicitly approved invented figures for this project. Girasol is a speculative concept, not a real building, and these numbers are part of the fiction. Use only the figures below, state them with confidence, and keep them consistent across every page. Do not invent new ones without asking.
- Location: a south-facing facade in Miami.
- Building: 7 storeys, a glazed ground floor plus 6 floors behind the facade, 84 ft wide and 96 ft tall.
- Modules: 1,024 equilateral triangles, 4 ft on each side.
- Panels: 32 rhombus panels of 32 modules each.
- Opening range: 5% closed to 100% open.
- Peak output per module, fully open toward the sun: 180 W.
- Peak output for the whole facade: 184 kW.
- Energy on a clear day: about 1,150 kWh, enough to power about 40 homes for a day.
- Opening toward the sun collects up to 2.6 times more energy than a closed, flat skin.
- Every module has its own small motor and turns on its own.

## Content rule
Never invent facts, dimensions, dates or names Fran has not given. Ask instead. The only exception is the concept figures list above.

## Log-in gate
- Visitors sign up with email and password and log in, using Supabase Auth.
- Supabase project: girasol-facade (us-east-1, Free plan), https://jxeenqvokwceylkqenrf.supabase.co. Its URL and publishable key live in js/supabase-config.js.
- login.html is the log-in page and is never gated.
- index.html is the home page.
- Every page except login.html sends signed-out visitors to login.html. Pages stay hidden until the session check passes, so gated content never flashes.
- After log-in, go to index.html.
- A log-in lasts only for the current browser tab. Every new visit, new tab or link opened fresh starts at login.html.
- Log out is in the menu on every page and returns the visitor to login.html.
- Email confirmation is off: a new account is logged in straight away and goes to index.html. If confirmation is ever turned back on, sign-up shows "Check your email to confirm your account."
- Only the Supabase project URL and the public anon (publishable) key go in the code. Never the service role key.
- All links are relative.

## How it is built
- Plain HTML, CSS and JavaScript files only. No frameworks, no npm, no build step.
- Supabase loads from its CDN script tag.
- The 3D model uses Three.js, loaded from the jsDelivr CDN through an import map, pinned to one version. The model is built in code from simple shapes based on the geometry described in DESIGN.md. No 3D model files are required.
  - Three.js is pinned to version 0.160.0.
  - The facade is drawn as a field of 4 ft triangles over the 84 ft width and the 6 upper floors. Whole triangles only, so the model shows about 1,000 modules; the text always says 1,024.
  - Building depth is not given. The model uses 48 ft as a visual stand-in. It is never stated on the site. (Ask Fran for the real depth.)
- index.html sits at the top of the folder.
- Suggested files: index.html, day.html, module.html, login.html, css/style.css, js/supabase-config.js, js/auth.js, js/login.js, js/menu.js, js/model.js, js/home.js, js/day.js, js/module.js, images/.
- It must work on a phone, including touch dragging of the sun and modules.
- Published from GitHub to Vercel.
  - GitHub: https://github.com/franherrerom/girasol-facade (public). Every push to main deploys.
  - Live: https://girasol-facade.vercel.app

## Images
- Fran's files go in a folder called images.
- Where there is no file, use a plain grey box labelled [ADD: image of ...].
- Share image: images/share.jpg at 1200 by 630. Pages point to it with the full live address (https://girasol-facade.vercel.app/images/share.jpg) so it shows when the link is texted; this is the one exception to relative links. Until Fran supplies it, use a grey placeholder labelled [ADD: image of the Girasol facade opening at noon].
- The 3D canvas on each page has a text alternative describing what it shows.

## Out of scope
- Payments.
- Storing anything about visitors beyond their log-in.
- Any database tables.
- Analytics, cookie banners, pop-ups.

## Done when
- [x] Works on a phone. (Tested on a real phone.)
- [x] The menu reaches every page, and the logo links home.
- [x] Sign up, log in and log out work.
- [x] Typing a page address (ending .html) while signed out sends me to log-in.
- [x] Every new tab or fresh visit starts at the log-in page.
- [x] Every image and 3D view has a text alternative.
- [x] The live link opens in a new tab or window.
- [x] The home opening plays on its own, the text follows shortly after, and the sun dial can be spun.
- [x] Clicking a triangle on A Day opens The Module with a smooth transition.
- [x] Concept figures match the list above on every page.
- [ ] Real share image instead of the grey placeholder.
