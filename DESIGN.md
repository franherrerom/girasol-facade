# DESIGN.md: Girasol Facade

## Concept
Girasol is a building skin of solar modules that open toward the sun like a sunflower and close when it leaves. The site hands the visitor the sun and lets them watch the building follow it through a whole day.

Key sentence, repeated wherever it fits: "The building follows the sun all day to make its own energy."

## References
Apple product pages. Borrowed: the system only. One object is the hero and fills the screen. Scroll drives the object: it rotates, explodes into its parts and reassembles. Short headlines appear one at a time with generous empty space around them. Interaction feels physical and immediate.
Not borrowed: no Apple names, logos, product imagery, text, layouts copied screen for screen, or the SF Pro typeface.

Project geometry comes from Fran's own drawings, described here in words (the drawings are not used on the site):
- Elevation: a field of equilateral triangular modules wraps the upper floors, above a fully glazed ground floor with an entry cut into the glass. Slab lines read faintly through the skin.
- Module: a triangular frame holding three inner leaves, hinged at the frame edges. Closed, the leaves lie nearly flat (5% open). Open, they swing outward toward the sun (100% open) and reveal light behind.
- Exploded axon, from building to skin: stacked floor slabs on V-shaped columns, a diamond diagrid frame offset from the slab edges, and rhombus panels filled with modules.

## Colour
The background follows the sun. It blends continuously between four states as the sun moves.
- Dawn #F4D3CC, background at sunrise. Text #1A1A1F.
- Noon #F7F6F2, background at midday. Text #1A1A1F.
- Dusk #F2A55E, background at sunset. Text #1A1A1F.
- Night #0E1A33, background after dark. Text #F7F6F2.
- Sun #FFB547, the sun itself and its glow on the modules.
- Energy #FFD27A, light flowing through the facade when it collects energy, counters and energy diagrams.
- Ink #1A1A1F, primary text, button fill on light backgrounds.
- Paper #F7F6F2, button fill and text on the night background.
- Placeholder grey #D9D9D9 with label text #4A4A4A.

Model materials:
- Frame: brushed aluminium, base colour #C9CCD1, metallic, slightly rough.
- Leaves: white, #F2F2F0, matte.
- Solar cells: black glass, #0B0C10, glossy, catching sun highlights.
- Ground floor: clear glass with a faint cool tint.

City skyline (Home): flat silhouettes in two layers, a few shades from the sky colour, darker for the nearer layer. Never so dark that text over it drops below WCAG AA.

Text contrast must meet WCAG AA at every point of the day cycle. Between dusk and night, text switches from Ink to Paper at the moment contrast requires it.

## Type
Free Google Fonts only.
- Headlines: Inter Tight, weight 800, letter spacing -0.03em, line height 1.0.
- Body and labels: Inter, weight 400 and 500, line height 1.5.

Sizes:
- H1: clamp(48px, 9vw, 120px)
- Home title "Girasol": clamp(64px, 10vw, 168px), letter spacing -0.045em. The letters rise one after another when it appears, and the "o" is the logo mark, turning with the sun.
- H2: clamp(32px, 5vw, 64px)
- H3: 24px
- Body: 18px
- Small labels and footer: 14px minimum, never smaller

Headlines are short and bold. Body text is a sentence or two at most per block.

## Layout and grid
- 12 column grid, maximum width 1440px, 24px gutters.
- Page margins: 24px on phone, 64px on desktop.
- Spacing scale on an 8px base: 8, 16, 24, 40, 64, 104, 168.
- Home and The Module: free layout. The model fills the whole screen. Text floats over it in a corner, never covering the facade's centre.
- A Day: alternating layout. The model sits on one side (7 columns), text and energy diagrams on the other (5 columns). The sides swap at each time of day as the visitor scrolls. The model stays on screen the whole time and moves across smoothly when sides swap.
- On a phone, A Day stacks: the model is pinned to the top 55% of the screen, text scrolls below it.
- Home: the title, key sentence and button sit in the top-left corner; the sun dial sits in the bottom-left corner. On a wide screen the building sits in the right 7 columns. On a phone the building sits between the text and the dial, a little smaller.
- Home ground line: a thin line in the text colour runs the full width of the page at the base of the building. Behind it the city sits on flat ground the colour of the sky.
- A Day: the energy counter and the "Tap a triangle." hint sit together in the bottom corner on the model's side, and move with it.
- The Module on a phone: the module sits in the first screen; the figures and controls follow below it.
- Airy throughout. Empty space is part of the design.

## Image treatment
There are no photographs. The facade is a real-time 3D model. The only image files are the share image and grey placeholders labelled [ADD: image of ...] until Fran supplies files.

## Movement
Expressive, always smooth.
- Easing: cubic-bezier(0.22, 1, 0.36, 1) for almost everything.
- Durations: 400ms for interface, 800 to 1200ms for model moves, 4 seconds for the home opening.
- Page changes use cross-document view transitions so the site feels like one continuous space. Browsers without support get a plain 300ms fade.
- Explode and reassemble: parts separate along clear axes with slight stagger, then return the same way.
- Modules never snap. Every opening and closing is eased.
- prefers-reduced-motion: the model still responds to the sun, but explode sequences and camera flights become simple fades.
- Target 60 frames per second. If a phone can't hold it, reduce module count or shadow quality before cutting animation.

## Log-in page
The facade sits full screen behind a frosted glass panel, its modules slowly breathing open and closed. A single card floats in the centre: the word Girasol in Inter Tight 800, the key sentence below it, then email and password fields and a Log in button. A quiet "Create account" toggle switches the same card to sign-up without leaving the page. On successful log-in the frost clears and the view moves into the home page.

## Logo
A hexagon with a triangle drawn through three of its corners (top, lower right, lower left), from Fran's sketch. Thin even lines in the text colour, round joins. It sits at the top left of every page in place of the word Girasol, links to Home, and also sits above the log-in card.

## Sun dial (Home)
A minimal clock ring in place of dragging the sun. Thin rings and 24 hour ticks in the text colour; the sun is a Sun-coloured dot on the ring with a 2px text-colour outline. Labels at the four quarters: 12 Noon (top), 6 Sunrise, 18 Sunset, 0 Midnight (bottom). Sunrise sits on the right and Sunset on the left, so the dot sits on the same side as the real sun over the south-facing facade. The current time shows in the centre. Spin it with mouse or finger; it carries on a little after letting go and eases to a stop. Arrow keys move it half an hour.

## Menu and buttons
- Menu: a slim fixed bar across the top, transparent over the model. The logo on the left. Home, A Day, The Module and Log out on the right. Text colour follows the day cycle for contrast.
- On a phone: a Menu button opens a full-screen overlay with the same links in large type.
- Buttons: pill shaped, 48px tall, Ink fill with Paper text on light backgrounds, reversed at night. Hover lifts slightly and brightens. Focus shows a clear 2px outline.
- Hints like "Tap a triangle" appear as small pills that fade out once the visitor acts.
- On Home the hint is an annotation instead of a pill: "Spin the sun" in Inter 500, 16px, above and to the right of the dial, with a thin curved arrow in the text colour pointing down at the ring. The arrow draws itself in when the dial appears, and the note fades out once the visitor spins.

## Tone of voice
Short, confident, plain English. Present tense. One idea per line. No jargon, no architecture vocabulary the public won't know. A little dry wit is welcome. Numbers are stated with confidence.

## Never
1. Never show pop-ups, cookie banners or modal interruptions.
2. Never use text smaller than 14px or low-contrast grey text.
3. Never block the visitor with a loading screen. Headline and interface appear immediately; the model fades in when ready.
4. Never use stock photos, generic icons or anything that looks corporate or cheap.
5. Never copy Apple's identity: no names, logos, fonts, imagery or text.
