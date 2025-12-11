# Cursor AI Guidelines - Le Collecteur de Dose

## 📋 Project Overview

**Le Collecteur de Dose** is a Nuxt.js 3 application with a dark, medieval aesthetic inspired by Path of Exile. The app uses Vue 3 Composition API, TypeScript, Tailwind CSS, and Supabase.

### Tech Stack

- **Framework**: Nuxt.js 3.x with Vue 3 Composition API
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + scoped CSS for complex effects
- **Database**: Supabase (PostgreSQL)
- **Animations**: GSAP for complex animations
- **i18n**: @nuxtjs/i18n (French/English)

---

## 🎨 Design System

### Single Source of Truth: Colors

**All colors MUST be imported from `constants/colors.ts`.**

```typescript
// ✅ Correct
import { COLORS, TIER_COLORS, getTierColors } from "~/constants/colors";

// ❌ Never hardcode colors
const color = "#af6025"; // DON'T DO THIS
```

### Tier Colors

| Tier | Primary   | Description          |
| ---- | --------- | -------------------- |
| T0   | `#c9a227` | Gold - Ambre sombre  |
| T1   | `#7a6a8a` | Purple - Obsidienne  |
| T2   | `#5a7080` | Blue/Steel - Ardoise |
| T3   | `#5a5a5d` | Gray - Basalte       |

### Using Colors

```typescript
// In TypeScript/Vue
import { getTierColors } from "~/constants/colors";
const colors = getTierColors("T0");
```

```css
/* In CSS (use variables from main.css) */
.element {
  color: var(--color-accent);
  background: var(--color-bg);
}
```

```html
<!-- In Tailwind -->
<div class="text-accent bg-poe-surface border-tier-t0"></div>
```

---

## 🧩 Components

### Use Existing Runic Components

**Always check if a Runic component exists before creating custom UI.**

| Component      | Usage                        |
| -------------- | ---------------------------- |
| `RunicButton`  | All buttons                  |
| `RunicBox`     | Container with stone styling |
| `RunicInput`   | Text inputs                  |
| `RunicSelect`  | Dropdown selects             |
| `RunicRadio`   | Toggle/radio groups          |
| `RunicModal`   | All modal dialogs            |
| `RunicIcon`    | SVG icons                    |
| `RunicDivider` | Decorative separators        |
| `RunicHeader`  | Section headers              |
| `RunicNumber`  | Numeric inputs               |
| `RunicStats`   | Statistics display           |

```vue
<!-- ✅ Correct -->
<RunicButton variant="primary" size="md" @click="save">
  Sauvegarder
</RunicButton>

<!-- ❌ Don't create custom buttons -->
<button class="custom-button" @click="save">Sauvegarder</button>
```

### Available Icons (RunicIcon)

`close`, `search`, `filter`, `play`, `pause`, `users`, `logout`, `settings`, `twitch`, `youtube`, `external`, `chevron-down`, `chevron-up`, `check`, `question`

```vue
<RunicIcon name="search" size="md" />
```

---

## 🎯 Tailwind CSS Rules

### ⚠️ IMPORTANT: Always Prefer Tailwind

**Use Tailwind classes directly in templates for all standard layouts and styling.**
Only use scoped CSS for complex visual effects that Tailwind cannot express.

### MUST Use Tailwind For (In Template)

| Property                   | Tailwind Class        | Example                             |
| -------------------------- | --------------------- | ----------------------------------- |
| `display: flex`            | `flex`                | `<div class="flex">`                |
| `display: grid`            | `grid`                | `<div class="grid">`                |
| `flex-direction: column`   | `flex-col`            | `<div class="flex-col">`            |
| `align-items: center`      | `items-center`        | `<div class="items-center">`        |
| `justify-content: center`  | `justify-center`      | `<div class="justify-center">`      |
| `justify-content: between` | `justify-between`     | `<div class="justify-between">`     |
| `gap: 0.5rem`              | `gap-2`               | `<div class="gap-2">`               |
| `padding: 1rem`            | `p-4`                 | `<div class="p-4">`                 |
| `margin-bottom: 1rem`      | `mb-4`                | `<div class="mb-4">`                |
| `position: relative`       | `relative`            | `<div class="relative">`            |
| `position: absolute`       | `absolute`            | `<div class="absolute">`            |
| `position: fixed`          | `fixed`               | `<div class="fixed">`               |
| `font-weight: 600`         | `font-semibold`       | `<span class="font-semibold">`      |
| `border-radius: 8px`       | `rounded-lg`          | `<div class="rounded-lg">`          |
| `width: 100%`              | `w-full`              | `<div class="w-full">`              |
| `max-width: 420px`         | `max-w-[420px]`       | `<div class="max-w-[420px]">`       |
| `overflow: hidden`         | `overflow-hidden`     | `<div class="overflow-hidden">`     |
| `flex-shrink: 0`           | `flex-shrink-0`       | `<div class="flex-shrink-0">`       |
| `pointer-events: none`     | `pointer-events-none` | `<div class="pointer-events-none">` |
| `z-index: 100`             | `z-[100]`             | `<div class="z-[100]">`             |

```html
<!-- ✅ CORRECT: Layout in Tailwind -->
<div
  class="fixed bottom-6 left-0 right-0 z-[10000] pointer-events-none flex justify-center px-4"
>
  <div class="w-full max-w-[420px] pointer-events-auto">
    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-4">
        <!-- Content -->
      </div>
      <div class="flex gap-2 justify-end pt-2 border-t border-white/5">
        <!-- Actions -->
      </div>
    </div>
  </div>
</div>
```

```css
/* ❌ WRONG: Don't use CSS for basic layout */
.modal-container {
  position: fixed;
  bottom: 1.5rem;
  left: 0;
  right: 0;
  z-index: 10000;
  display: flex;
  justify-content: center;
  padding: 0 1rem;
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
```

### Using @apply for Hybrid Approach

When you need Tailwind for layout but also custom visual styles, use `@apply`:

```css
/* ✅ CORRECT: Layout with @apply, visuals in CSS */
.replay-header__avatar {
  @apply w-10 h-10 rounded-full object-cover;
  border: 2px solid rgba(175, 96, 37, 0.5);
  box-shadow: 0 0 8px rgba(175, 96, 37, 0.2);
}

.outcome-title {
  @apply font-display text-base font-semibold leading-tight mb-1;
  color: rgba(200, 180, 160, 0.9);
}
```

### Keep in Scoped CSS (No Tailwind Alternative)

Complex visual effects that Tailwind can't express:

- **Multi-layer gradients** (`linear-gradient`, `radial-gradient` combinations)
- **Complex `box-shadow`** with multiple layers and insets
- **`@keyframes` animations** (heartbeat, earthquake, spin, etc.)
- **Pseudo-elements** (`::before`, `::after`) for decorative effects
- **3D transforms** (`transform-style: preserve-3d`, perspective)
- **CSS variables** with `calc()` operations
- **Filter effects** (`filter: drop-shadow(...)`, `backdrop-filter`)
- **Foil/holographic effects**
- **Tier-based theming** (using CSS custom properties)

```css
/* ✅ CORRECT: Keep complex visuals in CSS */
.altar-platform {
  --altar-accent: #3a3530;
  background: radial-gradient(
    ellipse at center,
    rgba(25, 23, 20, 0.6) 0%,
    rgba(18, 16, 14, 0.8) 50%,
    rgba(10, 9, 8, 0.95) 100%
  );
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.7), 0 2px 8px rgba(0, 0, 0, 0.4);
}

@keyframes heartbeat {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(var(--heartbeat-scale, 1.02));
  }
}
```

### Responsive with Tailwind

Use Tailwind breakpoint prefixes instead of media queries:

```html
<!-- ✅ CORRECT: Responsive in template -->
<div class="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
  <span class="text-sm sm:text-base">Content</span>
</div>
```

```css
/* ❌ WRONG: Don't use media queries for simple responsive */
@media (min-width: 640px) {
  .container {
    flex-direction: row;
    gap: 1rem;
  }
}
```

---

## 📝 Naming Conventions

### Variables & Functions

```typescript
// ✅ Concise but descriptive
const cardCount = 10;
const isLoading = ref(false);
const selectedTier = ref<CardTier>("T0");

// ✅ Good function names
function handleCardClick() {}
function fetchCards() {}
function updateTierFilter() {}
function getTierColors(tier: CardTier) {}

// ❌ Too long
const numberOfCardsCurrentlySelectedInTheCollection = 10;
function handleClickEventOnCardElementInTheGridView() {}

// ❌ Too short / unclear
const n = 10;
const x = ref(false);
function fn() {}
```

### Naming Patterns

| Type       | Pattern              | Example                        |
| ---------- | -------------------- | ------------------------------ |
| Boolean    | `is/has/should/can`  | `isLoading`, `hasError`        |
| Handler    | `handle{Event}`      | `handleClick`, `handleSubmit`  |
| Fetch      | `fetch/load{Entity}` | `fetchCards`, `loadUser`       |
| Computed   | Noun/adjective       | `filteredCards`, `sortedItems` |
| Ref        | Noun                 | `cards`, `selectedCard`        |
| Composable | `use{Feature}`       | `useTierColors`, `useCardSort` |
| Component  | PascalCase           | `GameCard`, `RunicButton`      |
| CSS class  | kebab-case + BEM     | `game-card__title--active`     |

### File Naming

```
components/
  ui/
    RunicButton.vue      # PascalCase for components
    RunicModal.vue
  card/
    GameCard.vue
    CardStack.vue

composables/
  useTierColors.ts       # camelCase with 'use' prefix
  useKeyboardShortcuts.ts

constants/
  colors.ts              # camelCase
  timing.ts

types/
  card.ts                # camelCase
  vaalOutcome.ts
```

---

## 🔧 TypeScript Guidelines

### Always Type Props and Emits

```typescript
interface Props {
  tier: CardTier;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  disabled: false,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
  update: [value: string];
}>();
```

### Use Existing Types

```typescript
// Import from types/
import type { Card, CardTier, CardVariation } from "~/types/card";
import type { VaalOutcome } from "~/types/vaalOutcome";
```

### Prefer `const` and Avoid `any`

```typescript
// ✅ Correct
const TIER_ORDER = ["T0", "T1", "T2", "T3"] as const;
type TierOrder = (typeof TIER_ORDER)[number];

// ❌ Wrong
let tierOrder = ["T0", "T1", "T2", "T3"]; // use const
function process(data: any) {} // type properly
```

---

## 🔄 Composables

### When to Create a Composable

Create a composable when logic is:

1. **Reused** in 2+ components
2. **Complex** (multiple refs, watchers, lifecycle hooks)
3. **Stateful** and needs to be shared

### Composable Structure

```typescript
// composables/useFeature.ts
export function useFeature(options?: Options) {
  // State
  const state = ref<State>(initialState);
  const isLoading = ref(false);

  // Computed
  const derivedValue = computed(() => state.value.length);

  // Methods
  function doSomething() {}
  async function fetchData() {}

  // Lifecycle (if needed)
  onMounted(() => {});
  onUnmounted(() => {});

  // Return public API
  return {
    state: readonly(state),
    isLoading: readonly(isLoading),
    derivedValue,
    doSomething,
    fetchData,
  };
}
```

### Existing Composables

| Composable             | Purpose                     |
| ---------------------- | --------------------------- |
| `useTierColors`        | Get tier-based colors       |
| `useKeyboardShortcuts` | Keyboard event handling     |
| `useCardGrouping`      | Group cards by variation    |
| `useCardSorting`       | Sort cards with persistence |
| `usePersistedFilter`   | SessionStorage filter state |
| `useFoilEffect`        | Foil animation management   |
| `useVaalOutcomes`      | Vaal orb outcome animations |
| `useReplayRecorder`    | Record altar interactions   |
| `useReplayPlayer`      | Playback recorded replays   |
| `useActivityLogs`      | Realtime Supabase logs      |

---

## 📁 Project Structure

```
LeCollecteurDeDose/
├── assets/css/
│   ├── main.css          # Global styles, CSS variables
│   ├── cards.css         # Card component base styles
│   ├── altar.css         # Altar shared styles
│   └── foil.css          # Complex foil effects
├── components/
│   ├── ui/               # Reusable Runic components
│   └── card/             # Card-specific components
├── composables/          # Shared logic
├── constants/
│   └── colors.ts         # COLOR SOURCE OF TRUTH
├── pages/                # Nuxt pages
├── types/                # TypeScript types
└── i18n/locales/         # Translations
```

---

## ⚠️ Common Mistakes to Avoid

### 1. Hardcoding Colors

```html
<!-- ❌ Wrong -->
<div style="color: #af6025"></div>
<div class="bg-[#0c0c0e]"></div>

<!-- ✅ Correct -->
<div class="text-accent bg-poe-bg"></div>
```

### 2. CSS for Basic Layout

```css
/* ❌ Wrong - use Tailwind in template instead */
.container {
  display: flex;
  gap: 1rem;
}
```

### 3. Creating Duplicate Components

```vue
<!-- ❌ Wrong: Custom modal -->
<div class="my-modal-overlay">
  <div class="my-modal-content">...</div>
</div>

<!-- ✅ Correct: Use RunicModal -->
<RunicModal v-model="isOpen" title="Mon Modal"> ... </RunicModal>
```

### 4. Inline SVG Icons

```vue
<!-- ❌ Wrong -->
<svg viewBox="0 0 24 24">
  <path d="M6 18L18 6M6 6l12 12" />
</svg>

<!-- ✅ Correct -->
<RunicIcon name="close" />
```

### 5. Duplicating CSS Across Files

If styles exist in a global CSS file (`altar.css`, `cards.css`), don't duplicate them in scoped styles.

### 6. Too Many Comments

```typescript
// ❌ Wrong - Obvious comments
// Get the card count
const cardCount = cards.length;

// Loop through cards
for (const card of cards) {
  // Check if card is valid
  if (card.isValid) {
    // Add to list
    validCards.push(card);
  }
}

// ✅ Correct - Comment only complex logic
// Weighted shuffle: higher tiers have lower probability of being first
const weightedCards = cards.sort((a, b) => {
  const weightA = TIER_WEIGHTS[a.tier] * Math.random();
  const weightB = TIER_WEIGHTS[b.tier] * Math.random();
  return weightB - weightA;
});
```

---

## 🌐 Internationalization

All user-facing text must be translated:

```vue
<template>
  <!-- ✅ Correct -->
  <h1>{{ $t("page.title") }}</h1>
  <p>{{ $t("card.count", { count: cards.length }) }}</p>

  <!-- ❌ Wrong -->
  <h1>Page Title</h1>
</template>
```

Translation files: `i18n/locales/fr.json`, `i18n/locales/en.json`

---

## 🧪 Code Quality Checklist

Before submitting code, verify:

- [ ] Colors imported from `constants/colors.ts`
- [ ] Layout uses Tailwind classes (flex, grid, spacing)
- [ ] Existing Runic components used when applicable
- [ ] Function/variable names are concise and descriptive
- [ ] TypeScript types properly defined
- [ ] No `any` types
- [ ] User-facing text uses `$t()` for i18n
- [ ] No duplicate CSS with global stylesheets
- [ ] Complex visual effects only in scoped CSS
- [ ] Props have default values when sensible

---

## 📚 Reference Files

- **Colors**: `constants/colors.ts`
- **Types**: `types/card.ts`, `types/vaalOutcome.ts`
- **Design System Doc**: `DESIGN_SYSTEM.md`
- **Tailwind Config**: `tailwind.config.ts`
- **Global CSS**: `assets/css/main.css`
