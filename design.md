# Forge-X — design direction

**Mood:** a blacksmith's forge at night. Warm near-black surfaces, molten ember accents, steel hairlines, technical mono readouts. Serious tool, not a toy. French copy.

## Typography
- Display: **Bricolage Grotesque** (700/800, tight tracking -0.03em) — headlines, big numbers.
- Body/UI: **Instrument Sans** (400/500/600), line-height 1.55.
- Mono: **JetBrains Mono** — seeds, DNA, addresses, counters, step indices, code.
- Hierarchy by size/weight; uppercase mono micro-labels (11px, tracking 0.14em) for section eyebrows.

## Color (CSS vars in styles.css)
- `--background` #0D0B09 (warm black), `--card` #15120F, raised #1C1814, `--border` #2A241E (steel hairline).
- `--foreground` #F3EDE4 (parchment), muted #9A8F82.
- **Ember** `--primary` #FF5A1F — primary actions, active step, focus. Hover #FF7A45.
- **Molten gold** #FFB547 — rarity "légendaire", highlights. Steel blue #7FA7C9 for info/charts secondary.
- Success #4ADE80, danger #F0533A.
- Never purple gradients. Glow = radial ember gradient at low alpha, used sparingly.

## Layout
- Landing: asymmetric hero (copy left, exploded 3D layer stack right), full-bleed marquee of generated NFTs, offset feature blocks, pricing in 3 columns with center plan raised.
- App: left rail (dashboard), studio = top step bar (numbered mono indices 01–07) + content + right sticky "forge panel" when useful.
- Corners: 6px for controls, 10px for panels. Hairline borders > shadows. Subtle noise texture on background.

## Motion
- Landing load: staggered reveal (motion), layers of the hero stack slide apart on load.
- App: minimal — progress bars, skeleton shimmer, hover lift 1px.

## Components
- Buttons: ember solid (dark text #160B05), ghost with border, mono small buttons for utility.
- Inputs: dark #110E0B, 1px border, ember focus ring.
- Badges for rarity tiers: Légendaire gold, Épique ember, Rare steel, Peu commun green, Commun muted.
