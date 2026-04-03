# Design System — Le Collecteur de Dose

> Reference complete pour reproduire et etendre le design system de l'application.
> Dark fantasy / Path of Exile aesthetic. Tout est sombre, sculpte, runique.

---

## Couleurs

### Accent (couleur principale d'interaction)

```
#af6025  — Default (copper/bronze PoE Unique)
#c97a3a  — Light (hover)
#8a4d1e  — Dark
rgba(175, 96, 37, 0.4)   — Glow
rgba(175, 96, 37, 0.15)  — Glow subtle
```

### Tiers (rarete des cartes)

| Tier | Primary | Background | Glow RGBA | Usage |
|------|---------|------------|-----------|-------|
| T0 | `#c9a227` | `#6d5a2a` | `201, 162, 39` | Legendary / Gold |
| T1 | `#7a6a8a` | `#3a3445` | `122, 106, 138` | Epic / Purple |
| T2 | `#5a7080` | `#3a4550` | `90, 112, 128` | Rare / Blue-Steel |
| T3 | `#5a5a5d` | `#2a2a2d` | `90, 90, 93` | Common / Gray |

### Backgrounds

```
#0a0a0c  — Primary (le plus sombre, body)
#0c0c0e  — Default
#151518  — Surface
#1a1a1f  — Surface light / Elevated
```

### Borders

```
#2a2a30  — Default
#3a3a40  — Light
```

### Texte

```
#e8e6e3  — Primary (titres, texte important)
#c8c8c8  — Default (corps de texte)
#7f7f7f  — Dim (labels secondaires)
#5a5a60  — Muted (texte tres discret)
rgba(140, 130, 120, 0.85) — Secondary (sous-titres)
```

### Couleurs speciales

```
Vaal (corruption rouge) : #c83232, #ff6b6b, #8b0000
Foil (holographique)    : #c0a0ff, #ffa0c0, #a0ffc0, #a0c0ff (cycle 4 couleurs)
Synthesised (glitch)    : #40e8e0, #80f0f0, #20b0b0
```

### Couleurs de stats combat (The Pit)

```
ATK  : #d44     (rouge chaud)
DEF  : #5a7080  (bleu acier = T2)
HP   : #4a9f5a  (vert)
SPD  : #c9a227  (or = T0)
PWR  : #7a6a8a  (violet = T1)
```

---

## Typographie

### Fonts (Google Fonts)

```
Display / Titres : "Cinzel", serif         — weights 400, 500, 600, 700
Body / Texte     : "Crimson Text", serif   — weights 400, 600, italic
Sous-titres      : "Cormorant Garamond", serif — italic
```

### Tailles utilisees

```
0.5rem   — Runes decoratives, labels micro
0.55rem  — Keywords badges, hints
0.6rem   — Petits labels, badges tier
0.65rem  — Noms de cartes compact, stats labels
0.7rem   — Texte secondaire, log entries
0.75rem  — Boutons XS, progress labels
0.8rem   — Texte courant compact
0.875rem — Boutons SM
0.9375rem — Boutons MD
1rem     — Texte courant
1.0625rem — Boutons LG
1.125rem — Sous-titres
1.5rem   — Titres (mobile)
1.75rem  — Titres (tablette)
2rem     — Titres (desktop)
```

### Poids

```
400 — Texte courant
600 — Semi-bold (boutons, labels, noms)
700 — Bold (titres, valeurs stats)
```

---

## Ombres (le "depth system")

C'est un des elements les plus importants du design. Tout element a un aspect "grave dans la pierre" ou "en relief".

### Container grave (RunicBox, inputs, nav groove)

```css
box-shadow:
  inset 0 4px 12px rgba(0, 0, 0, 0.7),    /* profondeur interne */
  inset 0 1px 3px rgba(0, 0, 0, 0.8),     /* bord superieur enfonce */
  inset 0 -2px 4px rgba(50, 45, 40, 0.08), /* reflet bas subtil */
  0 2px 8px rgba(0, 0, 0, 0.4),            /* ombre externe */
  0 1px 0 rgba(50, 45, 40, 0.25);          /* highlight external edge */
```

### Carte / element en relief

```css
box-shadow:
  0 4px 16px rgba(0, 0, 0, 0.5),           /* ombre portee */
  inset 0 1px 4px rgba(0, 0, 0, 0.5),     /* profondeur interne legere */
  inset 0 -1px 2px rgba(50, 45, 40, 0.04); /* reflet bas */
```

### Element en relief avec glow tier (hover)

```css
box-shadow:
  0 6px 24px rgba(0, 0, 0, 0.6),
  0 0 12px var(--tier-glow),                /* glow colore */
  inset 0 1px 4px rgba(0, 0, 0, 0.5);
```

### Input groove (profondement enfonce)

```css
box-shadow:
  inset 0 3px 10px rgba(0, 0, 0, 0.8),
  inset 0 1px 3px rgba(0, 0, 0, 0.9),
  inset 0 -1px 1px rgba(60, 55, 50, 0.08),
  0 1px 0 rgba(45, 40, 35, 0.3);
```

### Progress bar track (encaisse)

```css
box-shadow:
  inset 0 3px 8px rgba(0, 0, 0, 0.75),
  inset 0 1px 2px rgba(0, 0, 0, 0.85),
  inset 0 -1px 3px rgba(50, 45, 40, 0.06),
  0 1px 0 rgba(50, 45, 40, 0.2);
```

### Modal (flottant au dessus de tout)

```css
box-shadow:
  0 25px 60px rgba(0, 0, 0, 0.8),
  0 10px 30px rgba(0, 0, 0, 0.6),
  inset 0 1px 0 rgba(80, 75, 70, 0.15),
  inset 0 -1px 0 rgba(0, 0, 0, 0.3);
```

---

## Gradients (fond des containers)

### Pierre sombre (RunicBox, panels)

```css
background: linear-gradient(180deg,
  rgba(12, 12, 14, 0.95) 0%,
  rgba(18, 18, 20, 0.9) 30%,
  rgba(15, 15, 17, 0.95) 70%,
  rgba(10, 10, 12, 0.98) 100%);
```

### Pierre sombre header (RunicHeader)

```css
background: linear-gradient(180deg,
  rgba(16, 16, 18, 0.98) 0%,
  rgba(12, 12, 14, 0.95) 60%,
  rgba(10, 10, 12, 0.98) 100%);
```

### Groove enfonce (inputs, nav)

```css
background: linear-gradient(180deg,
  rgba(8, 8, 10, 0.95) 0%,
  rgba(14, 14, 16, 0.9) 40%,
  rgba(10, 10, 12, 0.95) 100%);
```

### Carte (frame)

```css
background: linear-gradient(180deg,
  rgba(14, 14, 16, 0.98) 0%,
  rgba(10, 10, 12, 0.96) 30%,
  rgba(12, 12, 14, 0.97) 70%,
  rgba(8, 8, 10, 0.99) 100%);
```

### Bouton primary

```css
background: linear-gradient(180deg,
  rgba(30, 25, 20, 0.95) 0%,
  rgba(15, 12, 10, 0.98) 100%);
```

### Fade en bas d'un contenu (overlay info carte)

```css
background: linear-gradient(to top,
  rgba(0, 0, 0, 0.9) 0%,
  transparent 100%);
```

---

## Borders

### Style des bordures

Toutes les bordures ont un traitement subtil :

```css
border: 1px solid rgba(40, 38, 35, 0.7);     /* Container standard */
border-top-color: rgba(30, 28, 25, 0.8);      /* Plus sombre en haut (enfonce) */
border-bottom-color: rgba(60, 55, 50, 0.3);   /* Plus clair en bas (relief) */
```

### Border radius

```
6px  — sm (boutons, petits elements, RunicBox)
8px  — Cartes (mobile)
10px — md (cartes desktop, RunicBox)
12px — lg (grands panels)
16px — xl (modals)
```

### Bordures de tier (cartes)

```css
border: 1px solid var(--tier-color);
/* T0: #c9a227, T1: #7a6a8a, T2: #5a7080, T3: #5a5a5d */
```

### Separateur gradient (horizontal)

```css
background: linear-gradient(to right,
  transparent,
  rgba(60, 55, 48, 0.4) 15%,
  rgba(80, 70, 55, 0.5) 50%,
  rgba(60, 55, 48, 0.4) 85%,
  transparent);
```

### Separateur accent (ligne lumineuse)

```css
background: linear-gradient(to right,
  rgba(175, 96, 37, 0.5),
  rgba(80, 70, 55, 0.2),
  transparent);
```

---

## Coins runiques (motif decoratif signature)

Chaque container "RunicBox" et chaque carte a 4 coins decoratifs en forme de L :

```
  ──┐            ┌──
  │              │       <- Lignes fines (1px)
                          formant un angle droit
  │              │       <- Couleur : gradient du tier
  ──┘            └──        ou de l'accent, tres subtil
```

### Implementation CSS

```css
.corner {
  position: absolute;
  pointer-events: none;
  z-index: 3;
}

/* Ligne horizontale */
.corner::before {
  content: '';
  position: absolute;
  height: 1px;
  width: 12-20px;
  background: linear-gradient(to right,
    rgba(var(--rgb), 0.35),
    transparent);
}

/* Ligne verticale */
.corner::after {
  content: '';
  position: absolute;
  width: 1px;
  height: 12-20px;
  background: linear-gradient(to bottom,
    rgba(var(--rgb), 0.35),
    transparent);
}

/* Positions */
top-left:     top: 8-14px; left: 8-14px;
top-right:    top: 8-14px; right: 8-14px; (gradient inverse)
bottom-left:  bottom: 8-14px; left: 8-14px; (gradient vers le haut)
bottom-right: bottom: 8-14px; right: 8-14px; (tout inverse)
```

### Tailles responsive

```
Mobile   : 12px, offset 8px
Tablette : 16px, offset 12px
Desktop  : 18-20px, offset 14px
```

---

## Composants

### RunicBox

Container principal. Fond pierre grave, coins runiques, profondeur inset.

```
Props: padding (none | sm | md | lg), centered, attached
```

- `attached=true` : supprime le border-radius du haut (pour coller sous un RunicHeader)
- Padding responsive : sm=0.75rem/1rem (mobile) → 1rem/1.5rem (desktop)

### RunicHeader

Titre de section. Se place au dessus d'un RunicBox en mode `attached`.

```
Props: title, subtitle, centered, attached
```

- Titre : Cinzel uppercase, letter-spacing 0.08em, couleur `#d4c4a8`
- Runes decoratives `◆` de chaque cote du titre (accent color, glow subtil)
- Sous-titre : Cormorant Garamond italic, couleur dim
- Accents lineaires (traits horizontaux) en haut a gauche et droite
- Edge line en bas (gradient horizontal)

### RunicButton

Bouton avec effet de pierre gravee.

```
Props: variant (primary | secondary | ghost | twitch | youtube | danger)
       size (xs | sm | md | lg)
       icon, iconOnly, runeLeft, runeRight, disabled
```

- Inner border pseudo-element `::before` (inset 3px, border fine)
- Runes `◆` de chaque cote du texte (Cinzel uppercase)
- Variants changent : couleur texte, gradient fond, border, glow au hover

| Variant | Text color | Hover text | Hover glow |
|---------|-----------|------------|------------|
| primary | `#c9a227` | `#e0c060` | gold |
| secondary | `#7a6a5a` | `#a09080` | none |
| ghost | `#5a5a5a` | `#8a8078` | none |
| danger | `#ef4444` | `#f87171` | red |
| twitch | `#9146ff` | `#bf94ff` | purple |

### RunicProgressBar

Barre de progression avec effet grave et remplissage texture.

```
Props: value (0-100), showLabel, size (sm | md | lg), color (default | t0 | t1 | t2 | t3 | vaal)
```

- Track : gradient tres sombre, enfonce (inset shadows lourds)
- Fill : gradient 3 tons + texture diagonale (repeating-linear-gradient -45deg)
- Label centre : Cinzel bold, text-shadow lourd pour lisibilite
- 4 coins runiques minuscules dans le track

### RunicModal

Modal centre avec overlay sombre.

```
Props: visible, title, width (sm | md | lg | xl), closeOnOverlay, closeOnEscape
```

- Overlay : `rgba(0, 0, 0, 0.85)` + `backdrop-filter: blur(8px)`
- Content : gradient pierre, border chaude, shadow massive
- Header : titre en Cinzel `#c9a227` avec glow

### RunicInput

Champ de texte grave dans la pierre.

```
Props: modelValue, placeholder, icon (search | filter), size (sm | md | lg), clearable
```

- Groove tres enfonce (inset shadows 0.8-0.9 opacity)
- Glow line en bas qui apparait au focus (gradient accent, width 0→80%)
- Placeholder italic dim

### RunicDivider

Separateur horizontal avec rune centrale.

```
Props: variant (default | subtle | accent), label
```

- Deux lignes horizontales (gradient vers transparent) + rune `◆` au centre
- Variant accent : lignes en couleur `#af6025`

---

## Transitions

```
150ms ease           — Fast (hover simple)
300ms ease           — Base (changements generaux)
300ms cubic-bezier(0.03, 0.98, 0.52, 0.99)  — Smooth (mouvements fluides)
400ms cubic-bezier(0.34, 1.56, 0.64, 1)     — Bounce (rebond)
```

---

## Z-index

```
100    — Sticky elements
1000   — Dropdowns
9999   — Card detail view
10000  — Modals
```

---

## Scrollbars

```css
/* Global */
width: 8px;
track: var(--color-bg);        /* #0c0c0e */
thumb: var(--color-border);    /* #2a2a30 */
thumb:hover: var(--color-text-dim); /* #7f7f7f */
radius: 4px;

/* Compact (classe .runic-scrollbar) */
width: 6px;
track: transparent;
thumb: rgba(60, 55, 50, 0.4);
radius: 3px;
```

---

## Motifs recurrents

### Header + Box attache

```html
<RunicHeader title="Titre" subtitle="Sous-titre" :attached="true" />
<RunicBox padding="md" :attached="true">
  <!-- contenu -->
</RunicBox>
```

Le header a `border-radius: 6px 6px 0 0` et pas de bordure basse.
La box a `border-radius: 0 0 6px 6px` et pas de bordure haute.
Ensemble ils forment un seul bloc visuel.

### Runes decoratives dans le texte

```
◆  (U+25C6) — Separateurs, bullet points, runes de boutons
✧  (U+2727) — Coins de cartes (back)
✦  (U+2726) — Centre de separateurs
```

### Texte avec glow

```css
text-shadow:
  0 2px 4px rgba(0, 0, 0, 0.8),       /* lisibilite */
  0 0 20px rgba(175, 96, 37, 0.2);     /* glow accent */
```

### Mise en avant d'un element actif

```css
border-color: rgba(175, 96, 37, 0.4);
box-shadow:
  0 0 15px rgba(175, 96, 37, 0.15),
  inset 0 0 8px rgba(175, 96, 37, 0.05);
```

### Element desactive / dim

```css
opacity: 0.3;
filter: grayscale(0.5);
pointer-events: none;
```

---

## Responsive breakpoints

```
Mobile   : default (< 640px)
Tablette : min-width: 640px (sm)
Desktop  : min-width: 1024px (lg)
Large    : min-width: 1280px (xl)
```

Approach mobile-first. Les tailles, paddings et grid columns scalent a chaque breakpoint.

---

## Animations existantes

```
shimmer     — 3s ease-in-out infinite (opacity 0.5↔1)
float       — 6s ease-in-out infinite (translateY 0↔-5px)
spin        — 0.8s linear infinite (rotation 360deg)
pulse-record — 1s ease-in-out infinite (opacity+scale)
```

### Micro-animations de "juice" (The Pit combat)

```
shake       — 0.3s (translateX -3/+3px, pour les impacts)
damage float — 1s ease-out (translateY vers le haut + fade out)
low HP pulse — 2s infinite (box-shadow rouge inset qui pulse)
ability ready — 1.5s infinite (box-shadow accent qui pulse)
log slide-in — 0.2s ease-out (translateY + opacity)
```
