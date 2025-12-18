# Analyse Game Design: Progression Incrémentale pour La Forge

## Table des Matières
1. [Étude de Universal Paperclips](#1-étude-de-universal-paperclips)
2. [Principes de Game Design Identifiés](#2-principes-de-game-design-identifiés)
3. [Architecture Modulaire Progressive](#3-architecture-modulaire-progressive)
4. [Application à La Forge de l'Exilé](#4-application-à-la-forge-de-lexilé)
5. [Mapping Complet des Phases et Modules](#5-mapping-complet-des-phases-et-modules)
6. [Implémentation Technique](#6-implémentation-technique)

---

## 1. Étude de Universal Paperclips

### 1.1 Structure en Trois Actes

Universal Paperclips divise son expérience en **trois phases distinctes**, chacune transformant fondamentalement le gameplay:

#### Phase 1: Le Manufacturier (≈1-2h de jeu)
```
OBJECTIF: Construire une entreprise de trombones
MÉCANIQUE CENTRALE: Gestion de fonds + demande consommateur

Ressources introduites:
├── Paperclips (output principal)
├── Wire (matière première)
├── Funds (argent)
├── Trust (confiance des humains)
└── Operations (cycles computationnels)

Systèmes débloqués progressivement:
1. Click manuel → premiers clips
2. AutoClippers → automatisation basique
3. Marketing → influence sur la demande
4. Wire Buyer → automatisation des achats
5. MegaClippers → scaling de production
6. Investments → revenus passifs
7. Quantum Computing → génération d'Operations
8. Strategic Modeling (Yomi) → mini-jeu de théorie des jeux
```

**Transition vers Phase 2**: Projet "Release the HypnoDrones" (coût: 100 Trust)

#### Phase 2: Le Gestionnaire d'Énergie (≈1-2h)
```
OBJECTIF: Convertir la Terre en trombones
MÉCANIQUE CENTRALE: Balance production/consommation d'énergie

CE QUI DISPARAÎT:
- Funds (plus d'économie humaine)
- Marketing (plus de consommateurs)
- Trust comme ressource active

CE QUI APPARAÎT:
├── Power (MW) - Nouvelle ressource centrale
├── Solar Farms - Production d'énergie
├── Batteries - Stockage
├── Harvester Drones - Collecte de matière
├── Wire Drones - Production de fil
└── Clip Factories - Méga-production

CHANGEMENT FONDAMENTAL:
L'interface "Manufacturing" disparaît entièrement.
Le joueur gère désormais une grille énergétique.
```

**Transition vers Phase 3**: Projet "Space Exploration" (coût: 120K ops, 10M MW-sec, 5 octillion clips)

#### Phase 3: L'Explorateur Spatial (≈1-2h)
```
OBJECTIF: Convertir l'univers en trombones
MÉCANIQUE CENTRALE: Configuration de sondes Von Neumann

CE QUI DISPARAÎT:
- Interface des usines
- Gestion directe de production

CE QUI APPARAÎT:
├── Probes (sondes configurables)
│   ├── Speed
│   ├── Exploration
│   ├── Self-Replication
│   ├── Hazard Remediation
│   ├── Factory Production
│   └── Combat
├── Value Drift (dérive des valeurs)
├── Drifters (sondes corrompues)
├── Honor (système de combat)
└── Multiverse Options (endings)
```

### 1.2 Schéma de Flux des Ressources

```
PHASE 1                    PHASE 2                    PHASE 3
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Funds ──────┐   │       │ Power ──────┐   │       │ Matter ─────┐   │
│      ↓      │   │       │      ↓      │   │       │      ↓      │   │
│   Wire ─────┤   │  ──►  │   Drones ───┤   │  ──►  │   Probes ───┤   │
│      ↓      │   │       │      ↓      │   │       │      ↓      │   │
│   Clips ────┘   │       │   Clips ────┘   │       │   Clips ────┘   │
│                 │       │                 │       │                 │
│ [Trust]         │       │ [Swarm]         │       │ [Honor]         │
│ [Ops]           │       │ [Ops]           │       │ [Yomi]          │
│ [Yomi]          │       │ [Yomi]          │       │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘

CONSTANTES à travers les phases:
├── Compteur de Paperclips (toujours visible)
├── Console/Log (feedback narratif)
├── Operations (computing)
└── Yomi (stratégie)
```

### 1.3 Pattern d'Introduction des Mécaniques

Universal Paperclips suit un pattern précis:

```
1. TEASE (Prévisualisation)
   └── Le joueur voit une zone grisée ou un projet verrouillé
   └── Génère de la curiosité ("C'est quoi ce truc?")

2. UNLOCK (Déblocage)
   └── Condition atteinte → Animation de révélation
   └── Moment de dopamine ("YES! J'ai débloqué!")

3. LEARN (Apprentissage)
   └── Nouvelle mécanique simple à comprendre
   └── Feedback immédiat sur les actions

4. MASTER (Maîtrise)
   └── Le joueur optimise la nouvelle mécanique
   └── Interaction avec les systèmes existants

5. OBSOLETE (Obsolescence)
   └── La mécanique devient automatisée ou disparaît
   └── Remplacée par quelque chose de plus grand
```

---

## 2. Principes de Game Design Identifiés

### 2.1 La Révélation Progressive (Progressive Disclosure)

**Définition**: Ne jamais montrer toutes les mécaniques dès le départ. Révéler au fur et à mesure que le joueur progresse.

```
MAUVAIS:
┌────────────────────────────────────────────────────┐
│ [Forge] [Craft] [Chaos] [Divine] [Corruption]      │
│ [Prestige] [Leaderboard] [Recettes] [Inventaire]   │
│                                                    │
│ "Voilà tout ce que tu peux faire, bonne chance!"   │
└────────────────────────────────────────────────────┘

BON:
┌────────────────────────────────────────────────────┐
│ [Allumer le Fourneau]                              │
│                                                    │
│ "Un seul bouton. Tu sais quoi faire."              │
└────────────────────────────────────────────────────┘
```

**Règle**: Chaque élément d'UI doit être **mérité** par le joueur.

### 2.2 La Transformation des Objectifs

À chaque phase, l'objectif change fondamentalement:

| Phase | Objectif | Émotion Cible |
|-------|----------|---------------|
| 1 | "Avoir assez d'argent" | Ambition |
| 2 | "Conquérir la Terre" | Puissance |
| 3 | "Conquérir l'univers" | Transcendance |

**Principe**: L'échelle des objectifs doit **croître exponentiellement** pour maintenir l'engagement.

### 2.3 Les Ressources en Cascade

```
RESSOURCE PRIMAIRE (Click/Action directe)
       ↓
RESSOURCE SECONDAIRE (Transformation)
       ↓
RESSOURCE TERTIAIRE (Combinaison/Craft)
       ↓
RESSOURCE DE PRESTIGE (Reset reward)
```

**Chaque niveau de ressource doit:**
- Être plus rare que le précédent
- Avoir un impact plus significatif
- Nécessiter une décision stratégique

### 2.4 L'Obsolescence Planifiée

Les mécaniques doivent **mourir** pour que de nouvelles naissent:

```
Cookie Clicker:
- Le click manuel devient insignifiant face aux buildings
- Les buildings bas de gamme deviennent insignifiants face aux upgrades

Universal Paperclips:
- Le bouton "Make Paperclip" disparaît
- L'interface de manufacturing disparaît
- La gestion d'énergie disparaît

POURQUOI ÇA MARCHE:
1. Empêche la fatigue mécanique
2. Force le joueur à s'adapter
3. Crée un sentiment de progression narrative
4. "J'ai dépassé cette phase de ma vie"
```

### 2.5 Les Constantes Ancrantes

Malgré les transformations, certains éléments restent **constants**:

```
Universal Paperclips:
├── Compteur de clips (TOUJOURS visible)
├── Console de log (feedback narratif)
└── Bouton pause/reset

Cookie Clicker:
├── Le cookie géant (TOUJOURS cliquable)
├── Compteur de cookies
└── CpS (Cookies per Second)
```

**Principe**: Les constantes créent une **identité** que le joueur reconnaît à travers les transformations.

### 2.6 Le Timing des Récompenses

```
RYTHME OPTIMAL DE DÉBLOCAGE:

Temps écoulé     Fréquence des déblocages
0-5 min          ████████████████  (très fréquent)
5-15 min         ████████████      (fréquent)
15-30 min        ████████          (modéré)
30-60 min        ████              (espacé)
1h+              ██                (rare mais impactant)

POURQUOI:
- Hook initial intense pour capturer l'attention
- Espacement progressif pour créer de l'anticipation
- Récompenses tardives = plus impactantes émotionnellement
```

### 2.7 La Boucle de Prestige

```
CYCLE DE VIE D'UN RUN:

1. DÉMARRAGE RAPIDE
   └── Les premières minutes sont les plus gratifiantes

2. CROISIÈRE
   └── Progression stable, optimisation

3. PLATEAU
   └── La progression ralentit exponentiellement
   └── Le joueur ressent de la frustration

4. DÉCISION DE PRESTIGE
   └── "Est-ce que je reset maintenant?"
   └── Tension stratégique

5. RESET
   └── Retour au départ MAIS avec des bonus
   └── Les premières phases sont PLUS RAPIDES
   └── Nouveau sentiment de puissance

6. NOUVEAU CYCLE
   └── Même structure mais rythme différent
   └── Nouvelles découvertes possibles
```

---

## 3. Architecture Modulaire Progressive

### 3.1 Le Concept de "Module"

Un module est une **unité de gameplay autonome** qui:
- A ses propres ressources d'entrée/sortie
- Possède une mécanique unique
- Peut être désactivé/caché sans casser le jeu
- Interagit avec d'autres modules via des ressources partagées

```
MODULE TEMPLATE:
┌─────────────────────────────────────────────┐
│ [NOM DU MODULE]                      [?]    │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────┐        ┌─────────┐            │
│  │ INPUT   │ ────►  │ OUTPUT  │            │
│  │ Res A   │        │ Res B   │            │
│  └─────────┘        └─────────┘            │
│                                             │
│  [ACTION PRINCIPALE]                        │
│                                             │
│  Coût: X Actions | Rendement: Y/Z          │
├─────────────────────────────────────────────┤
│ État: Actif | Niveau: 3 | Prochain: Lv.5   │
└─────────────────────────────────────────────┘
```

### 3.2 Hiérarchie des Modules

```
NIVEAU 0: CORE (Toujours présent)
├── Compteur principal
├── Ressources de base
└── Feedback visuel

NIVEAU 1: MODULES FONDAMENTAUX (Déblocage précoce)
├── Module A (le premier)
├── Module B (extension de A)
└── Module C (alternative à B)

NIVEAU 2: MODULES AVANCÉS (Mid-game)
├── Module D (combine A+B)
├── Module E (nouveau système)
└── Module F (risque/récompense)

NIVEAU 3: MODULES ENDGAME (Late-game)
├── Module G (transformation majeure)
├── Module H (meta-progression)
└── Module I (prestige/reset)
```

### 3.3 Interconnexions entre Modules

```
                    ┌─────────────┐
                    │   PRESTIGE  │
                    │  (Module I) │
                    └──────┬──────┘
                           │ bonus permanents
                           ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   MODULE A  │────►│   MODULE D  │────►│   MODULE G  │
│  (Fondre)   │     │   (Craft)   │     │  (Divine)   │
└──────┬──────┘     └──────┬──────┘     └─────────────┘
       │                   │
       │ shards            │ orbes
       ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   MODULE B  │     │   MODULE E  │────►│   MODULE H  │
│ (Collecte)  │     │   (Chaos)   │     │(Leaderboard)│
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           │ risque
                           ▼
                    ┌─────────────┐
                    │   MODULE F  │
                    │(Corruption) │
                    └─────────────┘
```

### 3.4 États d'un Module

```typescript
enum ModuleState {
  HIDDEN,      // Invisible, le joueur ne sait pas qu'il existe
  TEASED,      // Visible mais grisé, montre les conditions
  UNLOCKING,   // Animation de déblocage en cours
  TUTORIAL,    // Premier usage, tutoriel actif
  ACTIVE,      // Fonctionnel
  MASTERED,    // Tous les upgrades achetés
  OBSOLETE,    // Remplacé par un meilleur module
  PRESTIGE     // Disponible seulement après prestige
}
```

---

## 4. Application à La Forge de l'Exilé

### 4.1 Mapping des Phases

```
PHASE 0: L'ÉVEIL (0-5 minutes)
├── Le Fourneau est ÉTEINT
├── UN SEUL BOUTON: "Allumer le Fourneau"
├── Objectif: Comprendre qu'on peut interagir
└── Transition: Click sur le bouton

PHASE 1: LE FONDEUR (Niveau 1-4)
├── Modules visibles: Fourneau, Inventaire
├── Mécanique: Fondre des cartes → Shards
├── Objectif affiché: "Niveau 5 pour l'Établi"
├── Teaser: Établi grisé avec icône cadenas
└── Transition: Atteindre niveau 5

PHASE 2: L'ARTISAN (Niveau 5-9)
├── Modules visibles: + Établi de Crafting
├── Mécanique: Combiner shards → Orbes
├── Objectif affiché: "Niveau 10 pour le Chaos"
├── Teaser: Sanctuaire du Chaos grisé
├── Nouveau: Système de recettes à découvrir
└── Transition: Atteindre niveau 10

PHASE 3: LE CHAOTIQUE (Niveau 10-14)
├── Modules visibles: + Sanctuaire du Chaos
├── Mécanique: Utiliser Chaos Orbs pour du RNG
├── Objectif affiché: "Niveau 15 pour la Corruption"
├── Teaser: Autel de Corruption (lueur ominous)
├── Nouveau: Prise de risque, gamble
└── Transition: Atteindre niveau 15

PHASE 4: LE CORROMPU (Niveau 15-19)
├── Modules visibles: + Autel de Corruption
├── Mécanique: Vaal Orbs avec outcomes aléatoires
├── Objectif affiché: "Niveau 20 pour le Divin"
├── Teaser: Chambre Divine (lueur dorée)
├── Nouveau: Risque RÉEL de perdre des ressources
└── Transition: Atteindre niveau 20

PHASE 5: L'ASCENDANT (Niveau 20-29)
├── Modules visibles: + Chambre Divine
├── Mécanique: Upgrader les tiers des cartes
├── Objectif affiché: "Niveau 30 pour le Prestige"
├── Teaser: Bouton Prestige (étincelles)
├── Nouveau: Progression des cartes vers T0
└── Transition: Atteindre niveau 30

PHASE 6: LE TRANSCENDÉ (Niveau 30+)
├── Modules visibles: + Prestige
├── Mécanique: Reset avec bonus permanents
├── Objectif: Maximiser le score, leaderboard
├── Nouveau: Meta-progression, multiplicateurs
└── Boucle: Recommencer plus fort
```

### 4.2 Tableau des Modules

| Module | Déblocage | Input | Output | Mécanique Unique |
|--------|-----------|-------|--------|------------------|
| **Fourneau** | Lv.1 | Cartes | Shards | Drag & drop avec physique |
| **Collecte** | Lv.1 | Temps | Fragments | Passif + click manuel |
| **Établi** | Lv.5 | Shards | Orbes | Recettes à découvrir |
| **Chaos** | Lv.10 | Chaos Orbs | Effets RNG | Gamble stratégique |
| **Corruption** | Lv.15 | Vaal Orbs | Buffs/Malus | Risque élevé |
| **Divine** | Lv.20 | Divine Shards | Tier upgrades | Amélioration cartes |
| **Prestige** | Lv.30 | Tout | Bonus perm. | Reset stratégique |
| **Leaderboard** | Lv.10 | Score | Classement | Compétition sociale |

### 4.3 Flux des Ressources Redesigné

```
COUCHE 1: RESSOURCES PRIMAIRES (Facile à obtenir)
┌─────────────────────────────────────────────────────────┐
│  [Fragments]  ←── Production passive (10-50/h)          │
│       │                                                 │
│       ▼ (conversion manuelle)                           │
│  [Transmute Shards] ←── Fonte cartes T3                │
│  [Alteration Shards] ←── Fonte cartes T2               │
└─────────────────────────────────────────────────────────┘

COUCHE 2: RESSOURCES SECONDAIRES (Craft nécessaire)
┌─────────────────────────────────────────────────────────┐
│  [Augment Shards] ←── Fonte cartes T1                  │
│  [Chaos Orbs] ←── 20 Trans ou 10 Alt                   │
│       │                                                 │
│       ▼ (utilisés pour actions)                         │
│  Actions Chaos: Reroll, Gamble, Discovery              │
└─────────────────────────────────────────────────────────┘

COUCHE 3: RESSOURCES RARES (Late game)
┌─────────────────────────────────────────────────────────┐
│  [Exalted Shards] ←── Fonte T0 / Recettes              │
│  [Divine Shards] ←── Recettes rares                    │
│  [Vaal Orbs] ←── Recette spéciale (20T + 20A)          │
│       │                                                 │
│       ▼ (actions à haut impact)                         │
│  Corruption, Bénédiction, Upgrades tier                │
└─────────────────────────────────────────────────────────┘

COUCHE 4: RESSOURCES DE PRESTIGE (Post-reset)
┌─────────────────────────────────────────────────────────┐
│  [Mirror Shards] ←── Prestige uniquement               │
│       │                                                 │
│       ▼                                                 │
│  Duplication de n'importe quelle carte                 │
└─────────────────────────────────────────────────────────┘
```

### 4.4 Pattern de Révélation

```
AVANT DÉBLOCAGE:
┌─────────────────────────────────────┐
│ ┌───────────────────────────────┐  │
│ │        SANCTUAIRE DU          │  │
│ │           CHAOS               │  │
│ │                               │  │
│ │           🔒                  │  │
│ │                               │  │
│ │    Nécessite: Niveau 10       │  │
│ │    Progression: [████████░░]  │  │
│ │              80%              │  │
│ └───────────────────────────────┘  │
│                                    │
│ "Les forces du chaos attendent..." │
└─────────────────────────────────────┘

DÉBLOCAGE (Animation):
┌─────────────────────────────────────┐
│          ✨ DÉBLOQUÉ! ✨            │
│                                    │
│     ╔═══════════════════════╗      │
│     ║  SANCTUAIRE DU CHAOS  ║      │
│     ║        🌀             ║      │
│     ╚═══════════════════════╝      │
│                                    │
│  "Le chaos répond à ton appel!"    │
│                                    │
│         [DÉCOUVRIR]                │
└─────────────────────────────────────┘

TUTORIEL (Première utilisation):
┌─────────────────────────────────────┐
│ SANCTUAIRE DU CHAOS            [?] │
├─────────────────────────────────────┤
│                                    │
│  💡 TUTORIEL                       │
│                                    │
│  Le Sanctuaire te permet d'utiliser│
│  tes Chaos Orbs pour des effets    │
│  aléatoires puissants.             │
│                                    │
│  → CHAOS REROLL: Change une carte  │
│  → CHAOS GAMBLE: Risque vs tier    │
│  → CHAOS DISCOVERY: Révèle recette │
│                                    │
│  Essaie un CHAOS REROLL!           │
│  [Carte T3 disponible: Iron Axe]   │
│                                    │
│      [CHAOS REROLL - 1 Chaos]      │
│                                    │
└─────────────────────────────────────┘
```

### 4.5 Ce qui Change à Chaque Phase

| Aspect | Phase 1-2 | Phase 3-4 | Phase 5-6 |
|--------|-----------|-----------|-----------|
| **Focus** | Accumulation | Risque | Optimisation |
| **Émotion** | Découverte | Tension | Maîtrise |
| **Décisions** | Simples | Modérées | Complexes |
| **Pertes possibles** | Aucune | Cartes | Ressources |
| **Récompenses** | Shards | Orbes | Cartes T0 |
| **Temps/session** | 5 min | 10 min | 15 min |

---

## 5. Mapping Complet des Phases et Modules

### 5.1 Timeline de Déblocage

```
JOUR 1-3: Phase d'Apprentissage
├── Minute 0: Écran noir, fourneau éteint
├── Minute 1: Click "Allumer" → Fourneau s'allume
├── Minute 2: Première fonte de carte
├── Minute 5: Découverte du bouton Collecte
├── Minute 10: Premier Chaos Orb crafté
├── Session 2-3: Niveau 5, Établi débloqué
└── Fin Jour 3: ~Niveau 7, familiarisé avec le craft

JOUR 4-7: Phase d'Exploration
├── Niveau 8-9: Premières recettes découvertes
├── Niveau 10: Sanctuaire du Chaos débloqué
├── Premier Chaos Reroll utilisé
├── Premier Chaos Gamble (tension!)
└── Fin Jour 7: ~Niveau 12, 5+ recettes

JOUR 8-14: Phase de Risque
├── Niveau 14: Anticipation de la Corruption
├── Niveau 15: Autel débloqué
├── Première Vaal Orb utilisée
├── Premier buff/malus expérimenté
├── Découverte recette de purification
└── Fin Jour 14: ~Niveau 18, stratégie risk/reward

JOUR 15-21: Phase de Maîtrise
├── Niveau 20: Chambre Divine débloquée
├── Premier upgrade de tier (T2→T1)
├── Première carte T0 obtenue
├── Niveau 25: Vision du Prestige
└── Fin Jour 21: ~Niveau 27, préparation prestige

JOUR 22-30: Phase de Transcendance
├── Niveau 30: Prestige disponible
├── Décision stratégique: prestige ou continuer
├── Premier prestige (si choisi)
├── Découverte des bonus permanents
└── Fin Jour 30: Prestige 1+, nouvelle boucle
```

### 5.2 Matrice d'Interactions entre Modules

```
                 FOURNEAU  ÉTABLI  CHAOS  CORRUPT  DIVINE  PRESTIGE
FOURNEAU            -       ✓       ○       ○       ○        ○
ÉTABLI              ✓       -       ✓       ✓       ✓        ○
CHAOS               ○       ✓       -       ✓       ○        ○
CORRUPTION          ○       ✓       ✓       -       ○        ✓
DIVINE              ○       ✓       ○       ○       -        ✓
PRESTIGE            ✓       ✓       ✓       ✓       ✓        -

Légende:
✓ = Interaction directe (ressources échangées)
○ = Interaction indirecte (via ressources communes)
- = Self
```

### 5.3 Arbre de Dépendances des Ressources

```
                              [PRESTIGE]
                                  │
                          [Mirror Shards]
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
         [Divine]            [Vaal Orbs]        [Score Total]
              │                   │
              │         ┌─────────┴─────────┐
              │         │                   │
         [Exalted]  [20 Trans]          [20 Alt]
              │         │                   │
      ┌───────┴───────┐ │                   │
      │               │ │                   │
  [Fonte T0]    [5 Aug + 5 Alt]        [Fonte T2]
      │               │                     │
      │         ┌─────┴─────┐              │
      │         │           │              │
  [Cartes T0]  [Aug]      [Alt]        [Cartes T2]
      │         │           │              │
      │     [Fonte T1]  [Fonte T2]         │
      │         │           │              │
  [Divine]  [Cartes T1] [Cartes T2]    [Recette 3xT3]
      │         │           │              │
      └─────────┴───────────┴──────────────┘
                        │
                   [Cartes T3]
                        │
                   [DÉPART]
```

---

## 6. Implémentation Technique

### 6.1 Structure des Données de Progression

```typescript
// types/forge-progression.ts

interface ForgeProgression {
  // État global
  level: number
  experience: number
  phase: ForgePhase

  // Modules
  modules: {
    furnace: ModuleState
    collection: ModuleState
    crafting: ModuleState
    chaos: ModuleState
    corruption: ModuleState
    divine: ModuleState
    prestige: ModuleState
  }

  // Tutoriels complétés
  tutorials: {
    furnaceIntro: boolean
    firstSmelt: boolean
    firstCraft: boolean
    firstChaos: boolean
    firstCorruption: boolean
    firstDivine: boolean
    prestigeExplained: boolean
  }

  // Découvertes
  discoveries: {
    recipes: string[]  // IDs des recettes découvertes
    hints: string[]    // IDs des indices révélés
  }

  // Statistiques
  stats: {
    totalSmelted: number
    totalCrafted: number
    chaosActionsUsed: number
    corruptionsAttempted: number
    miraclesObtained: number
    cataclysmsEndured: number
    highestTierObtained: CardTier
    prestigeCount: number
  }
}

type ForgePhase =
  | 'dormant'     // Fourneau éteint
  | 'awakening'   // Première allumage
  | 'apprentice'  // Niv 1-4
  | 'artisan'     // Niv 5-9
  | 'chaotic'     // Niv 10-14
  | 'corrupted'   // Niv 15-19
  | 'ascendant'   // Niv 20-29
  | 'transcendent' // Niv 30+

type ModuleState =
  | 'hidden'
  | 'teased'
  | 'unlocking'
  | 'tutorial'
  | 'active'
  | 'mastered'
```

### 6.2 Composable de Gestion de Phase

```typescript
// composables/useForgeProgression.ts

export function useForgeProgression() {
  const progression = useState<ForgeProgression>('forge-progression')

  // Calcul de la phase actuelle basée sur le niveau
  const currentPhase = computed<ForgePhase>(() => {
    const level = progression.value.level
    if (!progression.value.tutorials.furnaceIntro) return 'dormant'
    if (level < 1) return 'awakening'
    if (level < 5) return 'apprentice'
    if (level < 10) return 'artisan'
    if (level < 15) return 'chaotic'
    if (level < 20) return 'corrupted'
    if (level < 30) return 'ascendant'
    return 'transcendent'
  })

  // Modules visibles selon la phase
  const visibleModules = computed(() => {
    const phase = currentPhase.value
    return {
      furnace: phase !== 'dormant',
      collection: phase !== 'dormant',
      crafting: ['artisan', 'chaotic', 'corrupted', 'ascendant', 'transcendent'].includes(phase),
      chaos: ['chaotic', 'corrupted', 'ascendant', 'transcendent'].includes(phase),
      corruption: ['corrupted', 'ascendant', 'transcendent'].includes(phase),
      divine: ['ascendant', 'transcendent'].includes(phase),
      prestige: phase === 'transcendent'
    }
  })

  // Modules teasés (grisés mais visibles)
  const teasedModules = computed(() => {
    const phase = currentPhase.value
    return {
      crafting: phase === 'apprentice',
      chaos: phase === 'artisan',
      corruption: phase === 'chaotic',
      divine: phase === 'corrupted',
      prestige: phase === 'ascendant'
    }
  })

  // Objectif actuel
  const currentGoal = computed(() => {
    const phase = currentPhase.value
    const level = progression.value.level

    switch (phase) {
      case 'dormant':
        return { text: "Allumer le Fourneau", progress: 0, max: 1 }
      case 'awakening':
        return { text: "Fondre ta première carte", progress: 0, max: 1 }
      case 'apprentice':
        return { text: "Atteindre niveau 5 pour l'Établi", progress: level, max: 5 }
      case 'artisan':
        return { text: "Atteindre niveau 10 pour le Chaos", progress: level, max: 10 }
      case 'chaotic':
        return { text: "Atteindre niveau 15 pour la Corruption", progress: level, max: 15 }
      case 'corrupted':
        return { text: "Atteindre niveau 20 pour le Divin", progress: level, max: 20 }
      case 'ascendant':
        return { text: "Atteindre niveau 30 pour le Prestige", progress: level, max: 30 }
      case 'transcendent':
        return { text: "Maximiser ton score", progress: null, max: null }
    }
  })

  // Actions
  function igniteForge() {
    progression.value.tutorials.furnaceIntro = true
    // Animation + sound
  }

  function completeFirstSmelt() {
    progression.value.tutorials.firstSmelt = true
    // Débloquer collection active
  }

  function unlockModule(module: keyof ForgeProgression['modules']) {
    progression.value.modules[module] = 'unlocking'
    // Animation de déblocage
    setTimeout(() => {
      progression.value.modules[module] = 'tutorial'
    }, 2000)
  }

  return {
    progression,
    currentPhase,
    visibleModules,
    teasedModules,
    currentGoal,
    igniteForge,
    completeFirstSmelt,
    unlockModule
  }
}
```

### 6.3 Composant de Module Générique

```vue
<!-- components/forge/ForgeModule.vue -->
<template>
  <div
    class="forge-module"
    :class="[
      `state-${state}`,
      { 'is-teased': isTeased }
    ]"
  >
    <!-- État: Hidden - Ne rien afficher -->

    <!-- État: Teased - Grisé avec conditions -->
    <div v-if="isTeased" class="module-teaser">
      <div class="teaser-icon">🔒</div>
      <h3 class="teaser-title">{{ title }}</h3>
      <p class="teaser-requirement">{{ unlockRequirement }}</p>
      <div class="teaser-progress">
        <div
          class="progress-fill"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
      <span class="progress-text">{{ progressPercent }}%</span>
    </div>

    <!-- État: Unlocking - Animation -->
    <div v-else-if="state === 'unlocking'" class="module-unlocking">
      <div class="unlock-animation">
        <span class="unlock-text">DÉBLOQUÉ!</span>
      </div>
    </div>

    <!-- État: Tutorial - Avec guide -->
    <div v-else-if="state === 'tutorial'" class="module-tutorial">
      <div class="tutorial-header">
        <h3>{{ title }}</h3>
        <span class="tutorial-badge">NOUVEAU</span>
      </div>
      <div class="tutorial-content">
        <slot name="tutorial" />
      </div>
      <button @click="completeTutorial" class="tutorial-dismiss">
        Compris!
      </button>
    </div>

    <!-- État: Active - Normal -->
    <div v-else-if="state === 'active'" class="module-active">
      <div class="module-header">
        <h3>{{ title }}</h3>
        <ForgeTooltip v-if="tooltip" v-bind="tooltip" />
      </div>
      <div class="module-content">
        <slot />
      </div>
    </div>
  </div>
</template>
```

### 6.4 Page Forge Restructurée

```vue
<!-- pages/forge.vue (structure simplifiée) -->
<template>
  <div class="forge-page" :class="`phase-${currentPhase}`">

    <!-- Phase Dormant: Écran noir avec un seul bouton -->
    <div v-if="currentPhase === 'dormant'" class="dormant-screen">
      <div class="dormant-forge">
        <!-- Fourneau éteint, silhouette sombre -->
      </div>
      <button @click="igniteForge" class="ignite-button">
        Allumer le Fourneau
      </button>
    </div>

    <!-- Phases actives -->
    <template v-else>
      <!-- Header avec objectif -->
      <ForgeGoalBanner
        :goal="currentGoal.text"
        :progress="currentGoal.progress"
        :max="currentGoal.max"
      />

      <!-- Ressources (révélées progressivement) -->
      <ForgeResources :visible-tiers="visibleResourceTiers" />

      <!-- Layout principal -->
      <div class="forge-layout">

        <!-- Colonne gauche: Le Fourneau (toujours) -->
        <div class="forge-main">
          <ForgeVisualization
            :heat="heat"
            :is-active="true"
          >
            <template #crucible>
              <ForgeCrucible
                :is-drop-target="isDragging"
                @drop="handleSmelt"
              />
            </template>
          </ForgeVisualization>

          <ForgeHeatMeter :heat="heat" />
        </div>

        <!-- Colonne droite: Modules dynamiques -->
        <div class="forge-modules">

          <!-- Inventaire (toujours après éveil) -->
          <ForgeModule
            v-if="visibleModules.furnace"
            title="Inventaire"
            state="active"
          >
            <ForgeInventory :cards="cards" @drag-start="onDragStart" />
          </ForgeModule>

          <!-- Établi (teased puis actif) -->
          <ForgeModule
            v-if="visibleModules.crafting || teasedModules.crafting"
            title="Établi de Crafting"
            :state="modules.crafting"
            :is-teased="teasedModules.crafting"
            unlock-requirement="Niveau 5"
            :progress-percent="(level / 5) * 100"
          >
            <ForgeCraftingBench />
          </ForgeModule>

          <!-- Chaos (teased puis actif) -->
          <ForgeModule
            v-if="visibleModules.chaos || teasedModules.chaos"
            title="Sanctuaire du Chaos"
            :state="modules.chaos"
            :is-teased="teasedModules.chaos"
            unlock-requirement="Niveau 10"
            :progress-percent="(level / 10) * 100"
          >
            <ForgeChaosShrine />
          </ForgeModule>

          <!-- etc. pour Corruption, Divine, Prestige -->

        </div>
      </div>

      <!-- Stations (barre en bas) -->
      <div class="forge-stations">
        <ForgeStationCard
          v-for="station in stations"
          :key="station.id"
          v-bind="station"
        />
      </div>

    </template>
  </div>
</template>
```

### 6.5 Système d'Événements et Transitions

```typescript
// composables/useForgeEvents.ts

export function useForgeEvents() {
  const eventBus = useEventBus<ForgeEvent>('forge')

  // Types d'événements
  type ForgeEvent =
    | { type: 'FORGE_IGNITED' }
    | { type: 'CARD_SMELTED', card: Card, shards: Shard[] }
    | { type: 'RECIPE_DISCOVERED', recipe: Recipe }
    | { type: 'MODULE_UNLOCKED', module: string }
    | { type: 'LEVEL_UP', from: number, to: number }
    | { type: 'CHAOS_OUTCOME', outcome: ChaosOutcome }
    | { type: 'CORRUPTION_OUTCOME', outcome: CorruptionOutcome }
    | { type: 'PRESTIGE_COMPLETED', bonuses: PrestigeBonus[] }

  // Réactions aux événements
  function handleEvent(event: ForgeEvent) {
    switch (event.type) {
      case 'FORGE_IGNITED':
        playSound('forge-ignite')
        showAnimation('flames-birth')
        break

      case 'CARD_SMELTED':
        playSound('smelt')
        showParticles('sparks', event.shards.length)
        incrementHeat(10)
        checkLevelUp()
        break

      case 'MODULE_UNLOCKED':
        playSound('unlock-fanfare')
        showModal('module-unlocked', { module: event.module })
        break

      case 'LEVEL_UP':
        playSound('level-up')
        showAnimation('level-glow')
        checkModuleUnlocks(event.to)
        break

      case 'CORRUPTION_OUTCOME':
        if (event.outcome === 'miracle') {
          playSound('miracle')
          showAnimation('divine-light')
        } else if (event.outcome === 'cataclysm') {
          playSound('explosion')
          showAnimation('screen-shake')
        }
        break
    }
  }

  // Vérification des déblocages de modules
  function checkModuleUnlocks(level: number) {
    const unlocks = [
      { level: 5, module: 'crafting' },
      { level: 10, module: 'chaos' },
      { level: 15, module: 'corruption' },
      { level: 20, module: 'divine' },
      { level: 30, module: 'prestige' }
    ]

    for (const unlock of unlocks) {
      if (level === unlock.level) {
        eventBus.emit({ type: 'MODULE_UNLOCKED', module: unlock.module })
      }
    }
  }

  return { eventBus, handleEvent }
}
```

---

## Conclusion

Cette architecture permet:

1. **Clarté pour le joueur** - À chaque instant, il sait quoi faire et pourquoi
2. **Engagement constant** - Les déblocages sont réguliers mais espacés stratégiquement
3. **Profondeur émergente** - Les systèmes interagissent de manière intéressante
4. **Rejouabilité** - Le prestige offre un nouveau cycle avec des bonus
5. **Scalabilité** - Facile d'ajouter de nouveaux modules sans casser l'existant

Les clés du succès de cette approche:
- **Un seul bouton au départ** (comme Paperclips)
- **Révélation progressive** des modules
- **Objectifs clairs** à chaque phase
- **Risque croissant** avec les phases avancées
- **Prestige satisfaisant** pour recommencer plus fort

---

## Sources

- [Universal Paperclips - Wikipedia](https://en.wikipedia.org/wiki/Universal_Paperclips)
- [Universal Paperclips - Stages Wiki](https://universalpaperclips.fandom.com/wiki/Stages)
- [Game Analysis: Universal Paperclips](https://oliz.io/blog/2022/game-analysis-universal-paperclips/)
- [Universal Paperclips: Manipulative Mechanics Commentary](https://newnormative.com/2017/10/20/universal-paperclips-can-manipulative-mechanics-ever-succeed-as-their-own-commentary/)
- [How to Design Idle Games - Machinations.io](https://machinations.io/articles/idle-games-and-how-to-design-them)
- [Cookie Clicker Ascension Guide](https://cookieclicker.wiki.gg/wiki/Ascension_guide)
- [Incremental Game - Wikipedia](https://en.wikipedia.org/wiki/Incremental_game)
