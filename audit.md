# Audit Complet - Le Collecteur de Dose

## 📋 Vue d'ensemble

Cette application est un jeu de collection de cartes inspiré de Path of Exile, avec un système de tirage à l'autel (Vaal Orb), une collection de cartes avec variations (standard/foil), et un système de replay des tirages.

**Stack technique :**
- Nuxt 3 avec TypeScript
- Tailwind CSS + CSS personnalisé
- GSAP pour les animations
- Supabase pour la base de données et le temps réel
- Authentification Twitch

---

## 🎨 Design System

### ✅ Points forts

1. **Palette de couleurs centralisée** dans `tailwind.config.ts` :
   - Couleurs PoE bien définies (`poe`, `accent`, `tier`, `unique`)
   - Variables CSS cohérentes dans `main.css` (`:root`)
   - Configuration des tiers (T0-T3) avec couleurs et glows

2. **Typographie définie** :
   - `font-display` : Cinzel (titres)
   - `font-body` : Crimson Text (corps)
   - Utilisées via classes Tailwind (`font-display`, `font-body`)

3. **Composants "Runic" cohérents** :
   - `RunicBox`, `RunicButton`, `RunicInput`, `RunicSelect`, `RunicRadio`, `RunicNumber`, `RunicStats`, `RunicHeader`
   - Style visuel unifié inspiré de la pierre gravée

### ⚠️ Problèmes identifiés

#### 1. Couleurs hardcodées en dehors du design system

| Fichier | Couleurs hardcodées | Recommandation |
|---------|---------------------|----------------|
| `RunicHeader.vue` | `#d4c4a8`, `rgba(175, 96, 37, 0.5)` | Utiliser `--poe-text` et `--accent` |
| `RunicInput.vue` | `#c8c8c8`, `rgba(175, 96, 37, ...)` | Utiliser variables CSS existantes |
| `RunicSelect.vue` | `#c97a3a`, `#c8c8c8` | Utiliser `--accent` et `--poe-text` |
| `RunicNumber.vue` | `#c8c2b8`, `#d4b040`, etc. | Déjà bon avec CSS variables, cohérent |
| `GameCard.vue` | `#0a0908`, `#c8c8c8`, etc. | Certaines couleurs pourraient utiliser les variables |
| `ActivityLogsPanel.vue` | `#c45050`, `#c9a227`, etc. | Créer des variables pour les outcomes |
| `TwitchLoginBtn.vue` | `#9146ff` (Twitch) | Acceptable car couleur de marque externe |
| `default.vue` | `#0a0a0c`, `#c97a3a`, etc. | Utiliser les variables existantes |

#### 2. Styles répétitifs entre composants

Le pattern "pierre gravée" (carved stone) est répété dans plusieurs composants avec des valeurs légèrement différentes :

```css
/* Pattern répété dans RunicInput, RunicSelect, RunicRadio, RunicBox, RunicNumber */
background: linear-gradient(180deg, rgba(8, 8, 10, 0.95)..., rgba(14, 14, 16, 0.9)..., rgba(10, 10, 12, 0.95)...);
box-shadow: inset 0 3px 10px rgba(0, 0, 0, 0.8), inset 0 1px 3px rgba(0, 0, 0, 0.9)...;
border: 1px solid rgba(35, 32, 28, 0.8);
```

**Recommandation :** Créer des mixins CSS ou des variables CSS pour ces patterns récurrents :

```css
:root {
  --surface-carved-bg: linear-gradient(180deg, rgba(8, 8, 10, 0.95) 0%, rgba(14, 14, 16, 0.9) 40%, rgba(10, 10, 12, 0.95) 100%);
  --surface-carved-shadow: inset 0 3px 10px rgba(0, 0, 0, 0.8), inset 0 1px 3px rgba(0, 0, 0, 0.9), inset 0 -1px 1px rgba(60, 55, 50, 0.08), 0 1px 0 rgba(45, 40, 35, 0.3);
  --surface-carved-border: 1px solid rgba(35, 32, 28, 0.8);
}
```

#### 3. Couleurs de tiers dupliquées

Les couleurs des tiers sont définies à plusieurs endroits :

| Emplacement | Usage |
|-------------|-------|
| `types/card.ts` - `TIER_CONFIG` | Configuration principale |
| `tailwind.config.ts` - `colors.tier` | Classes Tailwind |
| `cards.css` - variables CSS | Styles de cartes |
| `useAltarAura.ts` - `TIER_COLORS` | Animations d'aura |
| `replay/[id].vue` - `TIER_COLORS` | Duplication inutile |
| `ActivityLogsPanel.vue` - inline styles | Couleurs tier hardcodées |

**Recommandation :** Centraliser dans un seul fichier et importer partout :

```ts
// constants/colors.ts
export const TIER_COLORS = {
  T0: { primary: '#c9a227', glow: 'rgba(201, 162, 39, 0.6)', ... },
  T1: { primary: '#7a6a8a', glow: 'rgba(122, 106, 138, 0.5)', ... },
  ...
} as const;
```

---

## 🧩 Architecture des Composants

### ✅ Points forts

1. **Bonne séparation** : Composants UI génériques (`ui/`) vs composants métier (`card/`)
2. **Composables bien structurés** pour la logique réutilisable
3. **Types TypeScript** bien définis dans `types/`

### ⚠️ Problèmes identifiés

#### 1. `GameCard.vue` - Fichier trop volumineux (~1700 lignes)

Ce composant gère trop de responsabilités :
- Affichage de la carte (preview)
- Vue détaillée (floating)
- Animations GSAP d'ouverture/fermeture
- Effet foil avec tracking souris
- Gestion du zoom
- Sélecteur de variations

**Recommandation :** Extraire en sous-composants :
- `GameCardPreview.vue` - Affichage miniature
- `GameCardDetail.vue` - Vue détaillée (modale)
- Composable `useCardTilt.ts` - Logique de tilt/rotation

#### 2. `CardStack.vue` - Duplication de logique avec `useCardGrouping.ts`

Le composant recalcule les variations alors que le composable existe déjà.

**Recommandation :** Utiliser directement le résultat de `useCardGrouping`.

#### 3. Pages avec beaucoup de logique inline

- `pages/altar.vue` - ~3800 lignes (très volumineux)
- `pages/replay/[id].vue` - ~700 lignes avec animations complexes

**Observations sur `altar.vue` :**
- ✅ Utilise correctement `useReplayRecorder`, `useAltarEffects`, `useAltarAura`, `useVaalOutcomes`, `useCardGrouping`, `useDisintegrationEffect`
- ✅ Bonne séparation des responsabilités via composables
- ⚠️ La logique de préférences de recording (localStorage) pourrait être extraite dans un composable `useRecordingPreferences`
- ⚠️ Les animations d'entrée/sortie de carte (`getRandomEntryPoint`, `getRandomExitPoint`, `placeCardOnAltar`) pourraient être dans un composable `useCardFlightAnimation`

**Recommandation pour `replay/[id].vue` :**
- Les effets d'outcome (`transformToFoilEffect`, `destroyCardEffect`, etc.) pourraient être extraits dans un composable dédié
- Le composable `useVaalOutcomes.ts` existe déjà mais n'est pas utilisé dans replay

---

## 🔄 Composables

### ✅ Points forts

| Composable | Responsabilité | Évaluation |
|------------|----------------|------------|
| `useActivityLogs` | Logs temps réel Supabase | ✅ Bien conçu, pattern singleton |
| `useAltarAura` | Effets visuels aura | ✅ Encapsulation correcte |
| `useAltarEffects` | Heartbeat + earthquake | ✅ Bonne séparation |
| `useCardGrouping` | Groupement par ID | ✅ Logique claire |
| `useCardSorting` | Tri des cartes | ✅ Réutilisable |
| `useDisintegrationEffect` | Destruction visuelle | ✅ Technique mais isolé |
| `useFoilEffect` | Sélection effet foil | ✅ État global simple |
| `usePersistedFilter` | Filtres sessionStorage | ✅ Générique |
| `useReplayPlayer` | Lecture replay | ✅ Bien structuré |
| `useReplayRecorder` | Enregistrement replay | ✅ Complet |
| `useVaalOutcomes` | Logique outcomes | ⚠️ Non utilisé dans replay |

### ⚠️ Problèmes identifiés

#### 1. `useVaalOutcomes.ts` - Non utilisé dans `replay/[id].vue`

Le composable existe mais la page replay réimplémente les animations d'outcome. Cela crée une duplication de code (~200 lignes).

**Recommandation :** Refactorer `replay/[id].vue` pour utiliser `useVaalOutcomes`.

#### 2. Duplication `TIER_COLORS` entre composables

`useAltarAura.ts` et `replay/[id].vue` ont chacun leur propre définition.

#### 3. Logique de préférences localStorage dans `altar.vue`

Les préférences d'enregistrement (recordOnFoil, recordOnDestroyed, etc.) utilisent `localStorage` directement avec des watchers manuels. Ce pattern est répété ~10 fois.

**Recommandation :** Créer un composable `useRecordingPreferences` ou utiliser `usePersistedFilter` existant :

```ts
// Option 1: Utiliser usePersistedFilter (existe déjà mais pour sessionStorage)
// Option 2: Créer useLocalStorageRef (variante pour localStorage)
const recordOnFoil = useLocalStorageRef('record_foil', true);
```

---

## 📁 Fichiers CSS

### Structure actuelle

```
assets/css/
├── main.css      # Variables globales + base styles
├── cards.css     # Styles GameCard
├── altar.css     # Styles altar (partagés)
├── foil.css      # Effet foil "Glyphes Éteints"
└── foil-effects.css  # Autres effets foil
```

### ✅ Points forts

1. Bonne séparation par feature
2. Variables CSS pour la personnalisation
3. `altar.css` partagé entre `altar.vue` et `replay/[id].vue`

### ⚠️ Problèmes identifiés

#### 1. Styles scoped très volumineux

Les composants ont beaucoup de CSS scoped qui pourrait être externalisé ou simplifié :

| Composant | Lignes CSS scoped |
|-----------|-------------------|
| `GameCard.vue` | ~820 lignes |
| `RunicSelect.vue` | ~600 lignes |
| `ActivityLogsPanel.vue` | ~860 lignes |
| `RunicInput.vue` | ~330 lignes |
| `RunicRadio.vue` | ~430 lignes |

**Recommandation :** 
- Extraire les patterns communs (surfaces gravées, corners décoratives)
- Créer `assets/css/runic-patterns.css` pour les motifs partagés

#### 2. Media queries répétitives

Les breakpoints responsive sont répétés dans chaque composant avec des valeurs similaires.

**Recommandation :** Utiliser les breakpoints Tailwind de manière cohérente.

---

## 🎯 Recommandations Prioritaires

### Priorité Haute

1. **Centraliser les couleurs des tiers**
   - Créer `constants/colors.ts` avec toutes les palettes
   - Mettre à jour les composables pour l'utiliser
   - Supprimer les duplications dans `replay/[id].vue`

2. **Utiliser `useVaalOutcomes` dans replay**
   - Refactorer `pages/replay/[id].vue`
   - Éviter ~200 lignes de code dupliqué

3. **Créer des variables CSS pour les surfaces gravées**
   - `--surface-carved-bg`, `--surface-carved-shadow`, `--surface-carved-border`
   - Réduire la répétition dans les composants Runic

### Priorité Moyenne

4. **Refactorer `GameCard.vue`**
   - Extraire la vue détaillée
   - Créer `useCardTilt.ts` pour la logique de rotation

5. **Remplacer les couleurs hardcodées**
   - Audit des `rgba(175, 96, 37, ...)` → utiliser `--accent` variants
   - Audit des `#c8c8c8` → utiliser `--poe-text`

6. **Créer `assets/css/runic-patterns.css`**
   - Patterns de coins décoratifs
   - Animations partagées (pulse, glow)

### Priorité Basse

7. **Nettoyer les imports inutilisés**
   - Vérifier les imports dans les composables

8. **Documenter le design system**
   - Créer un fichier de référence des couleurs et patterns disponibles

---

## 📊 Résumé des duplications détectées

| Élément dupliqué | Occurrences | Action |
|------------------|-------------|--------|
| `TIER_COLORS` | 4+ | Centraliser |
| Surface gravée CSS | 6+ composants | Variables CSS |
| Animations outcome | 2 (altar, replay) | Utiliser composable |
| Coins décoratives CSS | 5+ composants | Pattern partagé |
| Pattern focus/hover runic | 6+ composants | Variables CSS |

---

## ✅ Ce qui est bien fait (à conserver)

1. **Composables atomiques** - Chaque composable a une responsabilité claire
2. **TypeScript strict** - Types bien définis pour les cartes et replays
3. **Animations GSAP** - Utilisation cohérente de GSAP pour les animations complexes
4. **i18n** - Internationalisation en place
5. **Supabase intégration** - Realtime bien géré pour les logs d'activité
6. **Auto-animate** - Utilisation de FormKit auto-animate pour les listes
7. **Tailwind config** - Configuration bien structurée avec extensions custom

---

## 🚀 Prochaines étapes suggérées

1. Créer `constants/colors.ts` et migrer les constantes de couleur
2. Créer les variables CSS pour les surfaces gravées dans `main.css`
3. Refactorer `replay/[id].vue` pour utiliser `useVaalOutcomes`
4. Auditer et remplacer les couleurs hardcodées (peut être fait progressivement)
5. Évaluer si `GameCard.vue` nécessite vraiment un split (selon la complexité de maintenance)

---

## 📈 Évaluation Globale

| Critère | Note | Commentaire |
|---------|------|-------------|
| **Architecture** | ⭐⭐⭐⭐ | Bonne séparation composants/composables |
| **Design System** | ⭐⭐⭐ | Bon mais couleurs hardcodées |
| **Réutilisabilité** | ⭐⭐⭐⭐ | Composables bien pensés |
| **Maintenabilité** | ⭐⭐⭐ | Certains fichiers trop volumineux |
| **TypeScript** | ⭐⭐⭐⭐⭐ | Types bien définis |
| **Animations** | ⭐⭐⭐⭐⭐ | GSAP utilisé de manière experte |
| **DRY** | ⭐⭐⭐ | Quelques duplications à corriger |

**Score global : 3.7/5** - Application bien structurée avec des axes d'amélioration clairs et réalisables.

---

*Audit généré le 10 décembre 2025*

