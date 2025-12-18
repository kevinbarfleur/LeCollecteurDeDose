# La Forge de l'Exilé - Proposition de Refonte Complète

> **Document de Game Design v2.0**
> Basé sur l'analyse de Universal Paperclips, Cookie Clicker, et les meilleures pratiques des jeux incrémentaux

---

## Table des Matières

1. [Vision et Philosophie](#1-vision-et-philosophie)
2. [Structure Narrative en 3 Actes](#2-structure-narrative-en-3-actes)
3. [Économie et Ressources](#3-économie-et-ressources)
4. [Les 9 Modules de Gameplay](#4-les-9-modules-de-gameplay)
5. [Système de Progression](#5-système-de-progression)
6. [Mécaniques de Risque](#6-mécaniques-de-risque)
7. [Système de Prestige](#7-système-de-prestige)
8. [Interface Utilisateur](#8-interface-utilisateur)
9. [Boucles de Gameplay](#9-boucles-de-gameplay)
10. [Équilibrage et Courbes](#10-équilibrage-et-courbes)
11. [Spécifications Techniques](#11-spécifications-techniques)

---

## 1. Vision et Philosophie

### 1.1 Le Pitch

> **"De l'étincelle à l'infini"**
>
> Tu es un Exilé échoué sur les rivages de Wraeclast. Dans les ruines d'une forge ancestrale,
> tu découvres le secret des Anciens: transformer les cartes de collection en essence pure.
> Ce qui commence par une simple flamme deviendra une odyssée vers la transcendance.

### 1.2 Pilliers de Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LES 4 PILLIERS DE LA FORGE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │  DÉCOUVERTE │  │ PROGRESSION │  │   RISQUE    │  │TRANSCENDANCE││
│  │             │  │             │  │             │  │             ││
│  │ "Qu'est-ce  │  │ "Je deviens │  │ "Est-ce que │  │ "Je suis    ││
│  │  que c'est?"│  │  plus fort" │  │  je tente?" │  │  au-delà"   ││
│  │             │  │             │  │             │  │             ││
│  │ Phases 1-2  │  │ Phases 2-4  │  │ Phases 4-5  │  │ Phase 6+    ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Émotions Cibles par Phase

| Phase | Émotion Primaire | Émotion Secondaire | Hook Principal |
|-------|------------------|-------------------|----------------|
| Acte I | Curiosité | Satisfaction | "C'est quoi ce truc?" |
| Acte II | Ambition | Tension | "Je veux plus de pouvoir" |
| Acte III | Transcendance | Nostalgie | "J'ai tout accompli" |

### 1.4 Différenciation vs Path of Exile

La Forge n'est PAS un simulateur de crafting PoE. C'est un **jeu incrémental narratif** où:
- Les cartes sont des **ressources à transformer**, pas des objets à équiper
- Le but est la **progression verticale**, pas l'optimisation horizontale
- Le prestige crée une **boucle de rejouabilité**, pas un endgame statique

---

## 2. Structure Narrative en 3 Actes

### 2.1 Vue d'Ensemble

```
ACTE I: L'ÉVEIL DE LA FORGE (Niveau 1-10)
├── Chapitre 1: La Flamme Éteinte (Niv. 0)
├── Chapitre 2: Les Premiers Éclats (Niv. 1-4)
└── Chapitre 3: L'Art du Façonnage (Niv. 5-10)

ACTE II: LA VOIE DU CHAOS (Niveau 11-25)
├── Chapitre 4: Les Murmures du Vide (Niv. 11-15)
├── Chapitre 5: La Corruption Rampante (Niv. 16-20)
└── Chapitre 6: L'Ascension Divine (Niv. 21-25)

ACTE III: LA TRANSCENDANCE (Niveau 26+)
├── Chapitre 7: Le Seuil de l'Infini (Niv. 26-30)
├── Chapitre 8: Le Premier Cycle (Prestige 1)
└── Chapitre 9+: Les Cycles Éternels (Prestige 2+)
```

### 2.2 Acte I: L'Éveil de la Forge

#### Chapitre 1: La Flamme Éteinte (Niveau 0)

**Contexte Narratif:**
> *Les braises de la Forge Ancestrale sont froides depuis des éons. Tu te tiens devant
> ce monument oublié, une étincelle de destin dans la paume de ta main.*

**État Initial:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                              🌑                                     │
│                                                                     │
│                     La Forge est éteinte.                          │
│                                                                     │
│                                                                     │
│                    ┌─────────────────────┐                         │
│                    │  ÉVEILLER LA FORGE  │                         │
│                    └─────────────────────┘                         │
│                                                                     │
│                                                                     │
│     "Les anciens forgerons ont laissé un héritage endormi.         │
│      Seul un Exilé peut rallumer la flamme."                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Mécanique:**
- UN SEUL BOUTON visible
- Click → Animation d'allumage (3 secondes)
- La forge s'illumine progressivement
- Les flammes naissent
- L'interface se révèle

**Transition:** Le joueur clique → Passage au Chapitre 2

---

#### Chapitre 2: Les Premiers Éclats (Niveau 1-4)

**Contexte Narratif:**
> *La flamme danse, affamée. Elle réclame un sacrifice pour grandir.*

**Éléments Révélés:**
1. Le Fourneau (central, animé)
2. L'Inventaire de départ (10 cartes T3)
3. La Jauge de Chaleur
4. Le compteur de Fragments

**Objectif Affiché:**
```
╔═══════════════════════════════════════════════════════════════════╗
║  OBJECTIF: Maîtriser les bases de la fonte                        ║
║  ─────────────────────────────────────────────────────────────────║
║  □ Fondre ta première carte                                       ║
║  □ Collecter 100 Fragments                                        ║
║  □ Atteindre le Niveau 5                                          ║
║  ─────────────────────────────────────────────────────────────────║
║  Récompense: Déblocage de l'Établi de Crafting                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

**Tutoriel Intégré:**
```
ÉTAPE 1: "Glisse une carte vers le Creuset"
         [Animation de flèche pointant vers le creuset]

ÉTAPE 2: "Regarde les shards apparaître!"
         [Particules + compteur qui monte]

ÉTAPE 3: "Les Fragments s'accumulent avec le temps"
         [Surbrillance du compteur passif]
```

**Ce qui est TEASÉ (grisé):**
- L'Établi de Crafting [🔒 Niveau 5]
- Le panneau des Stations [🔒]

---

#### Chapitre 3: L'Art du Façonnage (Niveau 5-10)

**Contexte Narratif:**
> *Les shards s'accumulent, mais leur potentiel reste inexploité.
> L'Établi des Anciens s'éveille, prêt à révéler ses secrets.*

**Déblocage: L'Établi de Crafting**

Animation de déblocage:
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                    ✨ NOUVEAU MODULE DÉBLOQUÉ ✨                    │
│                                                                     │
│              ╔═══════════════════════════════════╗                 │
│              ║                                   ║                 │
│              ║      ⚒️  ÉTABLI DE CRAFTING  ⚒️    ║                 │
│              ║                                   ║                 │
│              ║   "Combine les shards en orbes    ║                 │
│              ║    de pouvoir concentré."         ║                 │
│              ║                                   ║                 │
│              ╚═══════════════════════════════════╝                 │
│                                                                     │
│                       [ DÉCOUVRIR ]                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Nouvelles Mécaniques:**
1. **Crafting de Chaos Orbs** - 20 Transmute → 1 Chaos
2. **Système de Recettes** - Découverte par expérimentation
3. **Indices de Recettes** - Textes cryptiques à déchiffrer

**Ce qui est TEASÉ:**
- Sanctuaire du Chaos [🔒 Niveau 11]
- 12 recettes inconnues [?][?][?]...

---

### 2.3 Acte II: La Voie du Chaos

#### Chapitre 4: Les Murmures du Vide (Niveau 11-15)

**Contexte Narratif:**
> *Le Chaos n'est pas destruction. C'est transformation.
> Le Sanctuaire t'appelle, promettant pouvoir... et incertitude.*

**Déblocage: Sanctuaire du Chaos**

**Nouvelles Mécaniques:**

| Action | Coût | Effet | Risque |
|--------|------|-------|--------|
| **Chaos Reroll** | 1 Chaos | Change une carte en une autre du même tier | Aucun |
| **Chaos Gamble** | 3 Chaos | 50% tier+1, 50% destruction | Modéré |
| **Chaos Discovery** | 2 Chaos | Révèle l'indice d'une recette | Aucun |
| **Chaos Amplify** | 5 Chaos | Double les prochains shards (5 fontes) | Aucun |

**Introduction du Risque:**
- Premier système avec possibilité de PERTE
- Le joueur apprend que le risque fait partie du jeu
- Récompenses proportionnelles au risque

**Ce qui est TEASÉ:**
- Autel de Corruption [🔒 Niveau 16] (lueur rouge/vaal orbs/risitas inquiétante)

---

#### Chapitre 5: La Corruption Rampante (Niveau 16-20)

**Contexte Narratif:**
> *Les Vaal ont laissé un héritage maudit. Leur pouvoir corrompt tout ce qu'il touche.
> Mais dans la corruption... réside aussi la transcendance.*

**Déblocage: Autel de Corruption**

**La Mécanique de Corruption:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    💀 AUTEL DE CORRUPTION 💀                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                         🔮                                          │
│                    ════════════                                     │
│                   ╱            ╲                                    │
│                  ╱   CORROMPRE  ╲                                   │
│                 ╱    L'ATELIER   ╲                                  │
│                ╱                  ╲                                 │
│               ════════════════════                                  │
│                                                                     │
│  Coût: 1 Vaal Orb + 1 Action                                       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  OUTCOMES POSSIBLES:                                        │   │
│  │                                                             │   │
│  │  25% 😐 RIEN         - L'orbe est consommée sans effet     │   │
│  │  25% 🚀 BOOST        - +50% production pendant 24h         │   │
│  │  15% 💎 JACKPOT      - Gagne 10 Chaos Orbs                 │   │
│  │  15% 🔥 MALÉDICTION  - -25% production pendant 24h         │   │
│  │  12% 💀 CATACLYSME   - Perd 50% des shards actuels         │   │
│  │   5% ⭐ MIRACLE      - +1 Vaal + révèle recette rare       │   │
│  │   3% 🌟 APOTHEOSE    - Toutes les cartes +1 qualité        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Corruptions totales: 0                                            │
│  Meilleur outcome: -                                               │
│                                                                     │
│                    [ 💀 CORROMPRE 💀 ]                              │
│                                                                     │
│  ⚠️ "La corruption ne connaît ni pitié ni promesse."              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Anti-Frustration (Pity System):**
- Après 3 RIEN consécutifs: +10% chance de JACKPOT/MIRACLE
- Après 2 MALÉDICTION/CATACLYSME consécutifs: prochain = BOOST garanti
- Statistiques de corruptions visibles pour montrer la progression

**Ce qui est TEASÉ:**
- Chambre Divine [🔒 Niveau 21] (lueur dorée apaisante)

---

#### Chapitre 6: L'Ascension Divine (Niveau 21-25)

**Contexte Narratif:**
> *Au-delà du chaos et de la corruption, existe un pouvoir plus ancien.
> Les Divins ont façonné la réalité elle-même. Leur chambre s'ouvre à toi.*

**Déblocage: Chambre Divine**

**Nouvelles Mécaniques:**

| Action | Coût | Effet |
|--------|------|-------|
| **Bénédiction** | 1 Divine Shard | Upgrade tier: T3→T2→T1→T0 |
| **Exaltation** | 1 Exalted Shard | Normal→Superior→Masterwork |
| **Transmutation** | 5 Augment | 3× cartes T3 → 1× carte T2 |
| **Fusion Parfaite** | 10 Divine | 2× T0 identiques → 1× T0 Foil |

**La Pyramide de Qualité:**
```
                          ⭐ FOIL T0 ⭐
                         /            \
                       T0 Masterwork
                      /              \
                    T0 Superior     T1 Masterwork
                   /            \ /              \
                 T0 Normal    T1 Superior    T2 Masterwork
                /          \ /            \ /              \
              T1 Normal  T2 Superior   T3 Masterwork
             /        \ /           \ /
           T2 Normal  T3 Superior
          /        \ /
        T3 Normal ←── DÉPART
```

**Ce qui est TEASÉ:**
- Le Prestige [🔒 Niveau 26] (portail cosmique)

---

### 2.4 Acte III: La Transcendance

#### Chapitre 7: Le Seuil de l'Infini (Niveau 26-30)

**Contexte Narratif:**
> *Tu as maîtrisé le feu, le chaos, la corruption, et le divin.
> Il ne reste qu'une étape: abandonner tout pour tout recommencer... plus fort.*

**Préparation au Prestige:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                     🌌 LE SEUIL DE L'INFINI 🌌                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Tu as atteint les limites de ce cycle.                            │
│  Le Prestige t'attend.                                             │
│                                                                     │
│  ╔═════════════════════════════════════════════════════════════╗   │
│  ║  CE QUI SERA CONSERVÉ:                                      ║   │
│  ║  ─────────────────────────────────────────────────────────  ║   │
│  ║  ✓ Recettes découvertes (13/20)                            ║   │
│  ║  ✓ Statistiques et achievements                            ║   │
│  ║  ✓ Bonus de prestige accumulés                             ║   │
│  ║                                                             ║   │
│  ║  CE QUI SERA RÉINITIALISÉ:                                  ║   │
│  ║  ─────────────────────────────────────────────────────────  ║   │
│  ║  ✗ Niveau d'Atelier → 1                                    ║   │
│  ║  ✗ Toutes les ressources → 0                               ║   │
│  ║  ✗ Collection de cartes → Kit de départ + bonus            ║   │
│  ║  ✗ Buffs/Malédictions actifs                               ║   │
│  ╚═════════════════════════════════════════════════════════════╝   │
│                                                                     │
│  BONUS DU PROCHAIN CYCLE:                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ⭐ +25% production de base                                  │   │
│  │ 📦 +3 cartes T3 au départ                                   │   │
│  │ 💎 1 Chaos Orb au départ                                    │   │
│  │ 🔓 Déblocage accéléré des modules                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Score actuel: 45,230 pts                                          │
│  Score après prestige: 45,230 + (Niveau × 100) = 48,230 pts        │
│                                                                     │
│              [ 🌌 TRANSCENDER - PRESTIGE 1 🌌 ]                     │
│                                                                     │
│  "Tout ce qui a un début a une fin.                                │
│   Mais la fin est aussi un nouveau commencement."                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

#### Chapitre 8+: Les Cycles Éternels (Prestige 2+)

**Déblocages par Prestige:**

| Prestige | Bonus Permanent | Déblocage Spécial |
|----------|-----------------|-------------------|
| 1 | +25% prod, +3 T3 départ, 1 Chaos | Recettes conservées |
| 2 | +50% prod, +1 T2 départ, 2 Chaos | Station: Autel des Ancêtres |
| 3 | +75% prod, +1 T1 départ, 3 Chaos | Recettes légendaires |
| 4 | +100% prod, 1 Vaal départ, +2 actions | Station: Nexus Temporel |
| 5 | +125% prod, +1 T0 départ, 5 Chaos | Cartes Reliques |
| 6+ | +25%/niveau, bonus aléatoires | Cosmétiques de prestige |

**Nouvelles Stations (Post-Prestige):**

```
PRESTIGE 2: AUTEL DES ANCÊTRES
├── Invoque un ancêtre qui donne un bonus pour 24h
├── Ancêtres plus puissants débloqués par corruptions
└── Arbre de compétences d'ancêtres

PRESTIGE 4: NEXUS TEMPOREL
├── Accélère le temps (x2 production pendant 1h)
├── Rejoue un outcome de corruption
└── Prévisualise le prochain outcome
```

---

## 3. Économie et Ressources

### 3.1 Hiérarchie des Ressources

```
TIER 0: TEMPS (Ressource implicite)
│
├── TIER 1: RESSOURCES PASSIVES
│   ├── Fragments (10-100/heure selon niveau)
│   └── Actions (10/jour, régénération à minuit)
│
├── TIER 2: RESSOURCES DE FONTE
│   ├── Transmute Shards (T3 → 3)
│   ├── Alteration Shards (T2 → 2+1T)
│   ├── Augment Shards (T1 → 2+1A)
│   └── Exalted Shards (T0 → 1+1Au)
│
├── TIER 3: RESSOURCES CRAFTÉES
│   ├── Chaos Orbs (20T ou 10A)
│   ├── Divine Shards (recette rare)
│   └── Vaal Orbs (20T + 20A)
│
└── TIER 4: RESSOURCES DE PRESTIGE
    └── Mirror Shards (prestige uniquement)
```

### 3.2 Flux de Conversion

```
                            ┌──────────────┐
                            │   PRESTIGE   │
                            │ Mirror Shards│
                            └──────┬───────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│Divine Shards │          │  Vaal Orbs   │          │  Chaos Orbs  │
│              │          │              │          │              │
│ Recette:     │          │ Recette:     │          │ Recette:     │
│ 3 Exalt +    │          │ 20 Trans +   │          │ 20 Trans     │
│ 10 Chaos     │          │ 20 Alt       │          │ ou 10 Alt    │
└──────┬───────┘          └──────┬───────┘          └──────┬───────┘
       │                         │                         │
       │    ┌────────────────────┼────────────────────┐   │
       │    │                    │                    │   │
       ▼    ▼                    ▼                    ▼   ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│Exalted Shards│          │Augment Shards│          │Alterat Shards│
│              │          │              │          │              │
│ Fonte T0:    │          │ Fonte T1:    │          │ Fonte T2:    │
│ 1 Exalt      │          │ 2 Aug        │          │ 2 Alt        │
│ + 1 Aug      │          │ + 1 Alt      │          │ + 1 Trans    │
└──────┬───────┘          └──────┬───────┘          └──────┬───────┘
       │                         │                         │
       └─────────────────────────┼─────────────────────────┘
                                 │
                                 ▼
                        ┌──────────────┐
                        │Transmut Shards│
                        │              │
                        │ Fonte T3:    │
                        │ 3 Trans      │
                        │              │
                        │ ou           │
                        │ 100 Fragments│
                        │ → 10 Trans   │
                        └──────┬───────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  Fragments   │
                        │              │
                        │ Production:  │
                        │ 10-100/h     │
                        │ (passif)     │
                        └──────────────┘
```

### 3.3 Tableau de Valeur Relative

| Ressource | Valeur en Fragments | Temps pour obtenir (Niv.1) |
|-----------|---------------------|---------------------------|
| 1 Fragment | 1 | 6 min |
| 1 Transmute | 10 | 1h |
| 1 Alteration | 25 | 2.5h |
| 1 Augment | 60 | 6h |
| 1 Exalted | 150 | 15h |
| 1 Chaos Orb | 200 | 20h |
| 1 Divine | 600 | 60h (2.5 jours) |
| 1 Vaal Orb | 500 | 50h (2 jours) |
| 1 Mirror | ∞ | Prestige only |

### 3.4 Modificateurs de Qualité

| Qualité | Bonus Fonte | Bonus Craft | Obtention |
|---------|-------------|-------------|-----------|
| Normal | ×1.0 | - | Par défaut |
| Superior | ×1.5 (+50%) | Recettes +1 output | Exaltation |
| Masterwork | ×2.0 (+100%) | Recettes +2 output | Double Exaltation |
| Foil | ×3.0 (+200%) | Recettes spéciales | Drop rare / Prestige |

---

## 4. Les 9 Modules de Gameplay

### 4.1 Vue d'Ensemble des Modules

```
MODULES FONDAMENTAUX (Acte I)
├── 1. Le Fourneau - Fonte de cartes
├── 2. L'Atelier de Collecte - Production passive
└── 3. L'Établi de Crafting - Combinaison de shards

MODULES AVANCÉS (Acte II)
├── 4. Le Sanctuaire du Chaos - Actions aléatoires
├── 5. L'Autel de Corruption - Risque/Récompense extrême
└── 6. La Chambre Divine - Amélioration des cartes

MODULES ENDGAME (Acte III)
├── 7. Le Panthéon de Prestige - Reset et bonus permanents
├── 8. La Salle des Records - Achievements et statistiques
└── 9. Le Nexus des Défis - Challenges hebdomadaires
```

### 4.2 Module 1: Le Fourneau

**Rôle:** Centre névralgique, toujours visible, cœur de l'expérience

```
┌─────────────────────────────────────────────────────────────────────┐
│                         🔥 LE FOURNEAU 🔥                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                              /\    ~~    /\                         │
│                             /  \  ~~~~  /  \                        │
│                            |    \______/    |                       │
│                        +---+                +---+                   │
│                        |   +================+   |                   │
│                        |   |                |   |                   │
│                        |   |   [CREUSET]    |   |                   │
│                        |   |   Drop Zone    |   |                   │
│                        |   |                |   |                   │
│                        |   +================+   |                   │
│                        +---+                +---+                   │
│                            |   ════════════   |                     │
│                            +------------------+                     │
│                                                                     │
│  CHALEUR: [████████████░░░░░░░░] 65%                               │
│           Ardent - Production +15%                                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  DERNIÈRE FONTE:                                            │   │
│  │  "Iron Sword" (T3) → 3 Transmute Shards                     │   │
│  │  Bonus chaleur: +3 shards bonus                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Stats: 247 cartes fondues | Record: 15 en une session            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Mécaniques:**
- Drag & drop physique (Matter.js)
- Animation de fonte (2 secondes)
- Particules de shards qui volent
- Chaleur qui monte/descend

**Bonus de Chaleur:**

| Niveau | Nom | Bonus |
|--------|-----|-------|
| 0-20% | Froid | -10% shards |
| 21-40% | Tiède | ±0% |
| 41-60% | Chaud | +5% shards |
| 61-80% | Ardent | +15% shards |
| 81-100% | Incandescent | +25% shards + effets visuels |

---

### 4.3 Module 2: L'Atelier de Collecte

**Rôle:** Production passive, premier système d'automatisation

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ⚡ ATELIER DE COLLECTE ⚡                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PRODUCTION ACTUELLE: 45 Fragments/heure                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Base:        10/h                                          │   │
│  │  Niveau (+):  +20/h (niveau 15)                             │   │
│  │  Prestige:    +10/h (×1.25)                                 │   │
│  │  Buff actif:  +5/h (Boost de corruption)                    │   │
│  │  ═══════════════════════════════════════                    │   │
│  │  TOTAL:       45/h                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  FRAGMENTS ACCUMULÉS: 1,247                                        │
│  Temps depuis dernière collecte: 4h 32min                          │
│  Maximum stockable: 2,400 (24h de production)                      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               [⚡ COLLECTER +204 ⚡]                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  CONVERSION RAPIDE:                                                │
│  [100 Frag → 10 Trans] (Gratuit)                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Mécaniques:**
- Production passive 24/7
- Cap de stockage (encourage les visites régulières)
- Conversion automatique optionnelle
- Upgrades de production via prestige

---

### 4.4 Module 3: L'Établi de Crafting

**Rôle:** Transformation des shards en orbes, découverte de recettes

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ⚒️ ÉTABLI DE CRAFTING ⚒️                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  RECETTES CONNUES: 8/20                                            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ BASIQUES                                                     │  │
│  │ ┌────────────┐ ┌────────────┐ ┌────────────┐                │  │
│  │ │ 20 Trans   │ │ 10 Alt     │ │ 100 Frag   │                │  │
│  │ │     ↓      │ │     ↓      │ │     ↓      │                │  │
│  │ │ 1 Chaos    │ │ 1 Chaos    │ │ 10 Trans   │                │  │
│  │ │ [CRAFTER]  │ │ [CRAFTER]  │ │ [CONVERT]  │                │  │
│  │ └────────────┘ └────────────┘ └────────────┘                │  │
│  │                                                              │  │
│  │ DÉCOUVERTES                                                  │  │
│  │ ┌────────────┐ ┌────────────┐ ┌────────────┐                │  │
│  │ │ 3× T3 même │ │ 5 Aug +    │ │ 20T + 20A  │                │  │
│  │ │ type       │ │ 5 Alt      │ │            │                │  │
│  │ │     ↓      │ │     ↓      │ │     ↓      │                │  │
│  │ │ 1× T2      │ │ 1 Exalted  │ │ 1 Vaal Orb │                │  │
│  │ │ [CRAFTER]  │ │ [CRAFTER]  │ │ [CRAFTER]  │                │  │
│  │ └────────────┘ └────────────┘ └────────────┘                │  │
│  │                                                              │  │
│  │ NON DÉCOUVERTES                                              │  │
│  │ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │  │
│  │ │    ???     │ │    ???     │ │    ???     │ │    ???     │ │  │
│  │ │            │ │            │ │            │ │            │ │  │
│  │ │ "L'arc-en- │ │ "Le chaos  │ │ "La collec-│ │ "Défaire   │ │  │
│  │ │  ciel..."  │ │  purifié"  │ │  tion..."  │ │  le brill."│ │  │
│  │ │            │ │            │ │            │ │            │ │  │
│  │ └────────────┘ └────────────┘ └────────────┘ └────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  MODE EXPÉRIMENTATION:                                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Slot 1: [____]  Slot 2: [____]  Slot 3: [____]             │  │
│  │                                                              │  │
│  │  Glissez des ressources ou cartes pour expérimenter          │  │
│  │                                                              │  │
│  │  ⚠️ Si la recette n'existe pas, les ingrédients sont perdus  │  │
│  │                                                              │  │
│  │                    [ EXPÉRIMENTER ]                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Système de Recettes Complètes:**

| # | Indice | Ingrédients | Résultat | Découverte |
|---|--------|-------------|----------|------------|
| 1 | Base | 20 Transmute | 1 Chaos | Départ |
| 2 | Base | 10 Alteration | 1 Chaos | Départ |
| 3 | Base | 100 Fragments | 10 Trans | Départ |
| 4 | "Les jumeaux" | 3× T3 même type | 1× T2 | Expérim. |
| 5 | "Rareté attire" | 5× T3 même rareté | 1× T2 qualité | Expérim. |
| 6 | "L'arc-en-ciel" | 1× de chaque tier | 1 Divine | Chaos Disc. |
| 7 | "Chaos purifié" | 3 Chaos + 10 Alt | 1 Exalted | Chaos Disc. |
| 8 | "Perfection" | 1× T0 + 5 Exalted | T0 Masterwork | Niv. 22 |
| 9 | "Équilibre corr." | 20 Trans + 20 Alt | 1 Vaal | Niv. 15 |
| 10 | "Ascension" | 3× T2 même type | 1× T1 | Expérim. |
| 11 | "Chaos et corr." | 10 Chaos + 1 Vaal | 3 Divine | Niv. 18 |
| 12 | "Défaire brill." | 1× Foil + 10 Aug | 2× Normal même tier | Expérim. |
| 13 | "L'efficacité" | 50 Frag + 1 Chaos | +2 actions/jour perm. | Niv. 20 |
| 14 | "Amélio. perm." | 100 Alt + 50 Aug | +5% prod permanente | Niv. 24 |
| 15 | "Sacrifice ult." | T0 + T1 + T2 | T0 garanti | Miracle |
| 16 | "Purification" | 3 Vaal | Reset malédiction + 5 Chaos | Niv. 17 |
| 17 | "Triple fusion" | 3× T1 même type | 1× T0 aléatoire | Niv. 25 |
| 18 | "Éclat divin" | 5 Divine + 1 T0 | T0 Foil | Prestige 2 |
| 19 | "Miroir brisé" | 10 Mirror frags | 1 Mirror complet | Prestige 3 |
| 20 | "La Création" | 1 Mirror + T0 Foil | Duplique la carte | Prestige 5 |

---

### 4.5 Module 4: Le Sanctuaire du Chaos

**Rôle:** Introduction au risque contrôlé, utilisation des Chaos Orbs

```
┌─────────────────────────────────────────────────────────────────────┐
│                    🌀 SANCTUAIRE DU CHAOS 🌀                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Chaos Orbs disponibles: 12 🔵                                     │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐             │  │
│  │  │   REROLL   │  │   GAMBLE   │  │  DISCOVERY │             │  │
│  │  │     🎲     │  │     🎰     │  │     🔍     │             │  │
│  │  │            │  │            │  │            │             │  │
│  │  │ Change une │  │ 50% tier+1 │  │ Révèle un  │             │  │
│  │  │ carte sans │  │ 50% perte  │  │ indice de  │             │  │
│  │  │ perte      │  │            │  │ recette    │             │  │
│  │  │            │  │            │  │            │             │  │
│  │  │ Coût: 1 🔵 │  │ Coût: 3 🔵 │  │ Coût: 2 🔵 │             │  │
│  │  │            │  │            │  │            │             │  │
│  │  └────────────┘  └────────────┘  └────────────┘             │  │
│  │                                                              │  │
│  │  ┌────────────┐  ┌────────────┐                             │  │
│  │  │  AMPLIFY   │  │   SURGE    │  🔒 Niveau 14               │  │
│  │  │     ⚡     │  │     🌊     │                             │  │
│  │  │            │  │            │                             │  │
│  │  │ ×2 shards  │  │ +5 actions │                             │  │
│  │  │ (5 fontes) │  │ (1 jour)   │                             │  │
│  │  │            │  │            │                             │  │
│  │  │ Coût: 5 🔵 │  │ Coût: 8 🔵 │                             │  │
│  │  │            │  │            │                             │  │
│  │  └────────────┘  └────────────┘                             │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  CHAOS REROLL - Sélectionne une carte:                       │  │
│  │                                                              │  │
│  │  [Iron Sword T3] [Broken Wand T3] [Steel Axe T2]            │  │
│  │                                                              │  │
│  │  Carte sélectionnée: Iron Sword (T3)                        │  │
│  │  Résultat possible: N'importe quelle carte T3               │  │
│  │                                                              │  │
│  │                  [ 🎲 REROLL - 1 Chaos ]                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Stats Chaos: 34 utilisés | Gambles réussis: 8/15 (53%)           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 4.6 Module 5: L'Autel de Corruption

*(Voir section 2.3 Chapitre 5 pour le détail complet)*

**Mécaniques Avancées:**

```typescript
// Système de Pity
interface CorruptionState {
  totalCorruptions: number
  consecutiveNothing: number  // Reset à chaque outcome ≠ RIEN
  consecutiveBad: number      // Reset à chaque outcome positif
  lastOutcome: CorruptionOutcome
  miracleCount: number
  cataclysmsEndured: number
}

// Calcul des probabilités ajustées
function getAdjustedProbabilities(state: CorruptionState): OutcomeProbabilities {
  let probs = { ...BASE_PROBABILITIES }

  // Pity pour RIEN consécutifs
  if (state.consecutiveNothing >= 3) {
    probs.nothing -= 10
    probs.jackpot += 5
    probs.miracle += 5
  }

  // Pity pour mauvais outcomes consécutifs
  if (state.consecutiveBad >= 2) {
    probs.curse = 0
    probs.cataclysm = 0
    probs.boost += 15
  }

  return probs
}
```

---

### 4.7 Module 6: La Chambre Divine

*(Voir section 2.3 Chapitre 6 pour le détail complet)*

---

### 4.8 Module 7: Le Panthéon de Prestige

**Rôle:** Meta-progression, reset stratégique

```
┌─────────────────────────────────────────────────────────────────────┐
│                    🌌 PANTHÉON DE PRESTIGE 🌌                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PRESTIGE ACTUEL: ⭐⭐⭐ (Niveau 3)                                  │
│                                                                     │
│  ╔═════════════════════════════════════════════════════════════╗   │
│  ║  BONUS ACTIFS:                                              ║   │
│  ║  ─────────────────────────────────────────────────────────  ║   │
│  ║  🔥 Production: +75% (base)                                 ║   │
│  ║  📦 Départ: 10 T3 + 1 T2 + 1 T1                            ║   │
│  ║  💎 Ressources: 3 Chaos au départ                          ║   │
│  ║  🔓 Modules: Déblocage à -20% niveau requis                ║   │
│  ║  📜 Recettes: Accès aux recettes légendaires               ║   │
│  ╚═════════════════════════════════════════════════════════════╝   │
│                                                                     │
│  PROCHAIN PRESTIGE:                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Niveau requis: 30 (actuel: 27)                             │   │
│  │  Recettes requises: 15/20 (actuel: 14)                      │   │
│  │  T0 requis: 1 (actuel: 2) ✓                                │   │
│  │                                                             │   │
│  │  NOUVEAUX BONUS (Prestige 4):                               │   │
│  │  → +100% production totale                                  │   │
│  │  → 1 Vaal Orb au départ                                     │   │
│  │  → +2 actions par jour                                      │   │
│  │  → Déblocage: Nexus Temporel                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ARBRE DE PRESTIGE:                                         │   │
│  │                                                             │   │
│  │           [P5] ← [P4] ← [P3] ← [P2] ← [P1]                 │   │
│  │             │      │      ✓      ✓      ✓                   │   │
│  │             │      │                                        │   │
│  │             │      └── Nexus Temporel                       │   │
│  │             │                                               │   │
│  │             └── Cartes Reliques                             │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  SCORE TOTAL: 127,450 pts                                          │
│  Score du cycle actuel: 12,340 pts                                 │
│                                                                     │
│                  [ 🌌 CONDITIONS NON REMPLIES ]                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 4.9 Module 8: La Salle des Records

**Rôle:** Tracking des achievements, statistiques

```
┌─────────────────────────────────────────────────────────────────────┐
│                    🏆 SALLE DES RECORDS 🏆                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ACHIEVEMENTS: 24/50 débloqués                                     │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  RÉCENTS:                                                    │  │
│  │                                                              │  │
│  │  ✓ "Premier Sang" - Fondre ta première carte                │  │
│  │  ✓ "Alchimiste" - Crafter 10 Chaos Orbs                     │  │
│  │  ✓ "Joueur" - Réussir 5 Chaos Gambles                       │  │
│  │  ✓ "Survivant" - Endurer un Cataclysme                      │  │
│  │  ✓ "Béni" - Obtenir un Miracle                              │  │
│  │                                                              │  │
│  │  PROCHAIN:                                                   │  │
│  │  ○ "Maître Forgeron" - Fondre 1000 cartes (723/1000)        │  │
│  │  ○ "Corrupteur" - Utiliser 50 Vaal Orbs (34/50)             │  │
│  │  ○ "Transcendé" - Atteindre Prestige 5                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  STATISTIQUES GLOBALES:                                            │
│  ┌─────────────────────────┬────────────────────────────────────┐  │
│  │ Cartes fondues          │ 1,247                              │  │
│  │ Chaos craftés           │ 89                                 │  │
│  │ Corruptions tentées     │ 34                                 │  │
│  │ Miracles obtenus        │ 2                                  │  │
│  │ Cataclysmes endurés     │ 4                                  │  │
│  │ Recettes découvertes    │ 14                                 │  │
│  │ Temps de jeu total      │ 47h 23min                          │  │
│  │ Meilleure carte         │ T0 Starforge (Masterwork)          │  │
│  └─────────────────────────┴────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 4.10 Module 9: Le Nexus des Défis

**Rôle:** Contenu récurrent, objectifs hebdomadaires

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ⚔️ NEXUS DES DÉFIS ⚔️                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  DÉFI HEBDOMADAIRE: "La Semaine du Chaos"                          │
│  Temps restant: 3j 14h 22min                                       │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  OBJECTIFS:                                                  │  │
│  │                                                              │  │
│  │  ✓ Utiliser 20 Chaos Orbs (20/20)                           │  │
│  │  ○ Réussir 10 Chaos Gambles (7/10)                          │  │
│  │  ○ Obtenir un MIRACLE via corruption (0/1)                  │  │
│  │                                                              │  │
│  │  RÉCOMPENSES:                                                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │  │
│  │  │ 1 obj.   │  │ 2 obj.   │  │ 3 obj.   │                   │  │
│  │  │ 5 Chaos  │  │ 1 Vaal   │  │ Carte    │                   │  │
│  │  │ ✓ Récl.  │  │ ○        │  │ T1 🔒    │                   │  │
│  │  └──────────┘  └──────────┘  └──────────┘                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  LEADERBOARD DU DÉFI:                                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  #1  XxShadowxX        3/3 objectifs    +5,430 pts           │  │
│  │  #2  ForgeM4ster       3/3 objectifs    +5,210 pts           │  │
│  │  #3  ChaosLord420      2/3 objectifs    +3,100 pts           │  │
│  │  ...                                                         │  │
│  │  #47 TOI               2/3 objectifs    +2,890 pts           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  DÉFIS PASSÉS:                                                     │
│  ○ "Speed Run" - Non participé                                     │
│  ✓ "Le Collectionneur" - 2/3 objectifs, #23                       │
│  ✓ "Fonte Massive" - 3/3 objectifs, #8                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Système de Progression

### 5.1 Courbe d'Expérience

```
FORMULE: XP_requis(niveau) = 100 × niveau^1.5

Niveau │ XP Requis │ XP Cumulé │ Temps estimé (casual)
───────┼───────────┼───────────┼──────────────────────
   1   │      100  │       100 │ 10 min
   5   │    1,118  │     2,718 │ 2h
  10   │    3,162  │    10,746 │ 1 jour
  15   │    5,809  │    26,879 │ 3 jours
  20   │    8,944  │    52,469 │ 1 semaine
  25   │   12,500  │    89,089 │ 2 semaines
  30   │   16,432  │   138,564 │ 3 semaines
```

### 5.2 Sources d'XP

| Action | XP Base | XP Max (avec bonus) |
|--------|---------|---------------------|
| Fondre carte T3 | 5 | 15 |
| Fondre carte T2 | 15 | 45 |
| Fondre carte T1 | 50 | 150 |
| Fondre carte T0 | 200 | 600 |
| Crafter Chaos | 10 | 30 |
| Découvrir recette | 100 | 300 |
| Corruption réussie (Boost+) | 50 | 150 |
| Premier prestige | 500 | 500 |
| Challenge hebdo (par obj.) | 25 | 75 |

### 5.3 Déblocages par Niveau

```
TIMELINE DE DÉBLOCAGE:

Niv 1  ──●── Fourneau actif
         │
Niv 3  ──●── Conversion Fragments → Trans
         │
Niv 5  ──●── Établi de Crafting
         │   └── Recettes de base
         │
Niv 8  ──●── Mode Expérimentation
         │
Niv 11 ──●── Sanctuaire du Chaos
         │   ├── Chaos Reroll
         │   ├── Chaos Gamble
         │   └── Chaos Discovery
         │
Niv 14 ──●── Chaos Amplify & Surge
         │
Niv 16 ──●── Autel de Corruption
         │   └── Vaal Orb Corruption
         │
Niv 18 ──●── Recettes de corruption
         │
Niv 21 ──●── Chambre Divine
         │   ├── Bénédiction (tier up)
         │   └── Exaltation (quality up)
         │
Niv 24 ──●── Fusion Parfaite
         │
Niv 26 ──●── Prestige visible
         │
Niv 28 ──●── Prévisualisation prestige
         │
Niv 30 ──●── Prestige débloqué
```

---

## 6. Mécaniques de Risque

### 6.1 Échelle de Risque

```
RISQUE 0: SÉCURISÉ
├── Fonte de cartes
├── Collecte de fragments
├── Crafting de recettes connues
└── Chaos Reroll, Discovery, Amplify

RISQUE 1: MODÉRÉ
├── Chaos Gamble (50% perte de carte)
└── Expérimentation de recettes

RISQUE 2: ÉLEVÉ
├── Corruption Vaal (outcomes variés)
└── Recettes "tout ou rien"

RISQUE 3: EXTRÊME
├── Triple corruption (stacking)
└── Challenges hardcore (prestige 4+)
```

### 6.2 Mitigation du Risque

**Système de "Assurance":**
```
Avant une action risquée, le joueur peut activer une assurance:

┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️ ASSURANCE DISPONIBLE                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Action: Chaos Gamble sur "Steel Sword T2"                         │
│                                                                     │
│  Sans assurance:                                                   │
│  - 50% → T1 Steel Sword                                            │
│  - 50% → Carte détruite                                            │
│                                                                     │
│  Avec assurance (coût: 2 Chaos supplémentaires):                   │
│  - 50% → T1 Steel Sword                                            │
│  - 50% → Carte retournée (pas de gain, pas de perte)               │
│                                                                     │
│  [GAMBLE SANS ASSURANCE]     [GAMBLE AVEC ASSURANCE - 5 Chaos]     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Recovery Mechanics

| Situation | Méthode de Recovery |
|-----------|---------------------|
| Perte de carte Gamble | Chaos Reroll pour remplacer |
| Malédiction active | Recette de Purification |
| Cataclysme (perte shards) | Chaos Amplify pour rebuild |
| Série de RIEN | Pity system automatique |

---

## 7. Système de Prestige

### 7.1 Conditions de Prestige

```typescript
interface PrestigeRequirements {
  minLevel: number        // 30 minimum
  minRecipes: number      // 15 recettes découvertes
  minT0Cards: number      // 1 carte T0 minimum
  minCorruptions: number  // 10 corruptions (prestige 2+)
  specialCondition?: string  // Varie selon le prestige
}

const PRESTIGE_REQUIREMENTS: Record<number, PrestigeRequirements> = {
  1: { minLevel: 30, minRecipes: 15, minT0Cards: 1, minCorruptions: 0 },
  2: { minLevel: 30, minRecipes: 17, minT0Cards: 2, minCorruptions: 10 },
  3: { minLevel: 30, minRecipes: 18, minT0Cards: 3, minCorruptions: 20 },
  4: { minLevel: 30, minRecipes: 19, minT0Cards: 5, minCorruptions: 30,
       specialCondition: "1 Miracle obtenu" },
  5: { minLevel: 30, minRecipes: 20, minT0Cards: 7, minCorruptions: 50,
       specialCondition: "1 T0 Foil" },
}
```

### 7.2 Bonus de Prestige Détaillés

```
PRESTIGE 1: "L'Initié"
├── Production: +25%
├── Départ: 10 T3 → 13 T3
├── Ressources: 1 Chaos
├── Modules: Établi débloqué niveau 4 (au lieu de 5)
└── Permanent: Recettes conservées

PRESTIGE 2: "L'Adepte"
├── Production: +50% (cumulatif: +75%)
├── Départ: +1 T2
├── Ressources: 2 Chaos
├── Modules: Chaos débloqué niveau 9
├── Permanent: Autel des Ancêtres
└── Special: Ancêtres Tier 1 disponibles

PRESTIGE 3: "Le Maître"
├── Production: +75% (cumulatif: +150%)
├── Départ: +1 T1
├── Ressources: 3 Chaos
├── Modules: Corruption débloqué niveau 14
├── Permanent: Recettes Légendaires (#18-20)
└── Special: Corruption "safe" 1×/jour

PRESTIGE 4: "Le Transcendé"
├── Production: +100% (cumulatif: +250%)
├── Départ: +1 Vaal Orb
├── Actions: 12/jour (au lieu de 10)
├── Modules: Divine débloqué niveau 18
├── Permanent: Nexus Temporel
└── Special: Accélération temporelle

PRESTIGE 5: "L'Éternel"
├── Production: +125% (cumulatif: +375%)
├── Départ: +1 T0
├── Ressources: 5 Chaos + 1 Vaal
├── Modules: Tous débloqués niveau -5
├── Permanent: Cartes Reliques
└── Special: 1 Mirror Fragment/prestige

PRESTIGE 6+: "L'Infini"
├── Production: +25%/niveau supplémentaire
├── Départ: Bonus aléatoire
├── Cosmétiques: Effets visuels de prestige
└── Leaderboard: Multiplicateur de score
```

### 7.3 Score de Prestige

```javascript
function calculateScore(state: ForgeState): number {
  return (
    state.level * 100 +
    state.prestigeLevel * 5000 +
    state.recipesDiscovered * 500 +
    state.t0Cards * 200 +
    state.t1Cards * 50 +
    state.totalChaosEarned * 2 +
    state.corruptionsTotal * 100 +
    state.miraclesObtained * 1000 +
    state.mirrorShardsEarned * 10000 +
    state.challengesCompleted * 250
  )
}
```

---

## 8. Interface Utilisateur

### 8.1 Layout Principal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  L'ATELIER DE L'EXILÉ                    Niv.15 ⭐⭐ [████████░░] 67%       │
│  ═══════════════════════════════════════════════════════════════════════════│
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  OBJECTIF: Atteindre niveau 16 pour l'Autel de Corruption            │ │
│  │  [██████████████████████████████░░░░░░░░] 94%                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ RESSOURCES                                                   Actions: 7 ││
│  │ [Frag: 1,247] [T: 45] [A: 23] [Au: 8] [Ex: 2] [Ch: 12] [Va: 1] [Di: 0] ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌──────────────────────────┐  ┌────────────────────────────────────────┐  │
│  │                          │  │                                        │  │
│  │      🔥 FOURNEAU 🔥       │  │           📦 INVENTAIRE 📦             │  │
│  │                          │  │                                        │  │
│  │     (Visualisation)      │  │    (Cartes avec physique Matter.js)   │  │
│  │                          │  │                                        │  │
│  │    Chaleur: [████░] 65%  │  │    32 cartes | [T3: 24] [T2: 6] [T1: 2]│  │
│  │                          │  │                                        │  │
│  └──────────────────────────┘  └────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ STATIONS                                                                ││
│  │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     ││
│  │ │  ⚡    │ │  ⚒️    │ │  🌀    │ │  💀    │ │  ✨    │ │  🌌    │     ││
│  │ │Collecte│ │ Établi │ │ Chaos  │ │Corrupt.│ │ Divine │ │Prestige│     ││
│  │ │ [LV1]  │ │ [LV5]  │ │ [LV11] │ │ 🔒 94% │ │ 🔒 LV21│ │ 🔒 LV26│     ││
│  │ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    [⚡ COLLECTER +247 FRAGMENTS ⚡]                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  [📊 Records] [🏆 Leaderboard] [⚔️ Défis] [⚙️ Options]                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Système de Tooltips

**Structure du Tooltip:**
```
┌─────────────────────────────────────────────────┐
│ CHAOS GAMBLE                              [?]   │
├─────────────────────────────────────────────────┤
│                                                 │
│ QUOI:                                          │
│ Tente d'améliorer le tier d'une carte avec     │
│ un risque de la perdre.                        │
│                                                 │
│ POURQUOI:                                      │
│ C'est le moyen le plus rapide d'obtenir des    │
│ cartes de tier supérieur, mais risqué.         │
│                                                 │
│ COMMENT:                                       │
│ 1. Sélectionne une carte de ton inventaire     │
│ 2. Paye 3 Chaos Orbs                           │
│ 3. 50% de chance: tier +1                      │
│    50% de chance: carte détruite               │
│                                                 │
│ ─────────────────────────────────────────────  │
│ Coût: 3 Chaos Orbs                             │
│ Risque: Modéré                                 │
│ Stats: 8 réussites sur 15 tentatives (53%)     │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 8.3 Animations et Feedback

| Action | Animation | Son | Durée |
|--------|-----------|-----|-------|
| Fonte de carte | Carte tombe → flammes → particules shards | Sizzle + ding | 2s |
| Craft réussi | Items convergent → flash → item apparaît | Forge clang | 1.5s |
| Déblocage module | Cadenas brise → lumière → révélation | Fanfare | 3s |
| Corruption | Orbe pulse → écran tremble → outcome | Ominous → result | 4s |
| Level up | Barre flash → nombre monte → confetti | Level up jingle | 2s |
| Prestige | Écran blanc → cosmos → renaissance | Epic orchestral | 5s |

---

## 9. Boucles de Gameplay

### 9.1 Boucle Micro (5-10 minutes)

```
┌─────────────┐
│   CONNEXION │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│  COLLECTER  │────▶│   FONDRE    │
│  Fragments  │     │   Cartes    │
└──────┬──────┘     └──────┬──────┘
       │                   │
       │                   ▼
       │           ┌─────────────┐
       │           │   CRAFTER   │
       │           │    Orbes    │
       │           └──────┬──────┘
       │                   │
       │                   ▼
       │           ┌─────────────┐
       │           │   UTILISER  │
       │           │    Chaos    │
       │           └──────┬──────┘
       │                   │
       └───────────────────┘
              │
              ▼
       ┌─────────────┐
       │ DÉCONNEXION │
       │  (attendre) │
       └─────────────┘
```

### 9.2 Boucle Macro (1 semaine)

```
JOUR 1: Accumulation
├── Fondre le maximum de cartes
├── Crafter des Chaos Orbs
└── Expérimenter pour découvrir recettes

JOUR 2-3: Optimisation
├── Utiliser Chaos pour améliorer
├── Découvrir de nouvelles recettes
└── Préparer les corruptions

JOUR 4-5: Risque
├── Utiliser Vaal Orbs
├── Gérer les buffs/malédictions
└── Chaos Gambles stratégiques

JOUR 6-7: Consolidation
├── Compléter les challenges hebdo
├── Améliorer les cartes (Divine)
└── Planifier le prochain cycle
```

### 9.3 Boucle Meta (1 mois)

```
SEMAINE 1: Fondations
├── Rush niveau 10
├── Maîtriser fonte + craft
└── Découvrir 5+ recettes

SEMAINE 2: Chaos
├── Rush niveau 16
├── Premiers Chaos utilisés
└── Première corruption

SEMAINE 3: Ascension
├── Rush niveau 25
├── Première carte T0
└── Préparation prestige

SEMAINE 4: Transcendance
├── Atteindre niveau 30
├── Prestige!
└── Nouveau cycle commence
```

---

## 10. Équilibrage et Courbes

### 10.1 Courbe de Progression Idéale

```
ENGAGEMENT
    ▲
100%│    ●
    │   ╱ ╲     ●         ●
 75%│  ╱   ╲   ╱ ╲       ╱ ╲
    │ ╱     ╲ ╱   ╲     ╱   ╲
 50%│╱       ●     ╲   ╱     ╲
    │               ╲ ╱       ╲
 25%│                ●         ╲
    │                           ╲
  0%└────────────────────────────────▶ TEMPS
    │ HOOK  │LEARN│MASTER│PLATEAU│PRESTIGE│
    │(5min) │(1h) │(1sem)│(2sem) │(3sem)  │
```

### 10.2 Valeurs d'Équilibrage

```typescript
const BALANCE_CONSTANTS = {
  // Production
  BASE_FRAGMENTS_PER_HOUR: 10,
  FRAGMENTS_PER_LEVEL: 2,
  MAX_STORAGE_HOURS: 24,

  // Actions
  ACTIONS_PER_DAY: 10,
  ACTION_REGEN_HOUR: 24, // Reset à minuit

  // Fonte
  SMELT_XP_BASE: 5,
  SMELT_XP_MULTIPLIER: 3, // Par tier

  // Crafting
  CHAOS_COST_TRANSMUTE: 20,
  CHAOS_COST_ALTERATION: 10,
  VAAL_COST_TRANS: 20,
  VAAL_COST_ALT: 20,

  // Chaos
  GAMBLE_SUCCESS_RATE: 0.5,
  GAMBLE_COST: 3,
  DISCOVERY_COST: 2,

  // Corruption
  CORRUPTION_OUTCOMES: {
    nothing: 0.25,
    boost: 0.25,
    jackpot: 0.15,
    curse: 0.15,
    cataclysm: 0.12,
    miracle: 0.05,
    apotheosis: 0.03
  },

  // Prestige
  PRESTIGE_PRODUCTION_BONUS: 0.25,
  PRESTIGE_MIN_LEVEL: 30,
}
```

### 10.3 Simulations de Progression

**Joueur Casual (10 min/jour):**
```
Jour 1:  Niveau 2  | 1 Chaos  | 0 recettes découvertes
Jour 7:  Niveau 8  | 8 Chaos  | 3 recettes
Jour 14: Niveau 14 | 15 Chaos | 6 recettes
Jour 21: Niveau 20 | 25 Chaos | 10 recettes
Jour 30: Niveau 26 | 35 Chaos | 14 recettes
Jour 45: Prestige 1
```

**Joueur Actif (30 min/jour):**
```
Jour 1:  Niveau 4  | 3 Chaos  | 2 recettes
Jour 7:  Niveau 15 | 20 Chaos | 8 recettes
Jour 14: Niveau 24 | 45 Chaos | 14 recettes
Jour 21: Prestige 1
Jour 30: Niveau 22 (P1) | 55 Chaos | 17 recettes
```

**Joueur Hardcore (1h+/jour):**
```
Jour 1:  Niveau 6  | 5 Chaos  | 4 recettes
Jour 5:  Niveau 18 | 30 Chaos | 12 recettes
Jour 10: Niveau 28 | 60 Chaos | 16 recettes
Jour 14: Prestige 1
Jour 21: Prestige 2
Jour 30: Prestige 3+
```

---

## 11. Spécifications Techniques

### 11.1 Architecture Frontend

```
components/forge/
├── core/
│   ├── ForgeLayout.vue           # Layout principal
│   ├── ForgeHeader.vue           # Header avec niveau et objectif
│   └── ForgeResourceBar.vue      # Barre de ressources
│
├── modules/
│   ├── ForgeFurnace/
│   │   ├── ForgeFurnace.vue      # Container du fourneau
│   │   ├── ForgeVisualization.vue # Flammes animées
│   │   ├── ForgeCrucible.vue      # Zone de drop
│   │   └── ForgeHeatMeter.vue     # Jauge de chaleur
│   │
│   ├── ForgeCollection/
│   │   ├── ForgeCollection.vue    # Module collecte
│   │   └── ForgeCollectButton.vue # Bouton collecter
│   │
│   ├── ForgeCrafting/
│   │   ├── ForgeCrafting.vue      # Module crafting
│   │   ├── ForgeRecipeSlot.vue    # Slot de recette
│   │   └── ForgeExperiment.vue    # Zone expérimentation
│   │
│   ├── ForgeChaos/
│   │   ├── ForgeChaos.vue         # Module chaos
│   │   ├── ForgeReroll.vue        # Action reroll
│   │   ├── ForgeGamble.vue        # Action gamble
│   │   └── ForgeDiscovery.vue     # Action discovery
│   │
│   ├── ForgeCorruption/
│   │   ├── ForgeCorruption.vue    # Module corruption
│   │   └── ForgeCorruptAnim.vue   # Animation outcome
│   │
│   ├── ForgeDivine/
│   │   └── ForgeDivine.vue        # Module divin
│   │
│   └── ForgePrestige/
│       ├── ForgePrestige.vue      # Module prestige
│       └── ForgePrestigeTree.vue  # Arbre de prestige
│
├── inventory/
│   ├── ForgeInventory.vue         # Container inventaire
│   ├── ForgePhysicsContainer.vue  # Physics Matter.js
│   └── ForgeCardItem.vue          # Item de carte
│
├── ui/
│   ├── ForgeTooltip.vue           # Système tooltips
│   ├── ForgeModal.vue             # Modals génériques
│   ├── ForgeStationCard.vue       # Carte de station
│   ├── ForgeGoalBanner.vue        # Bannière objectif
│   └── ForgeProgressBar.vue       # Barre de progression
│
└── index.ts                       # Exports
```

### 11.2 Architecture Composables

```
composables/
├── useForge.ts                    # État global forge
├── useForgeProgression.ts         # Système de progression
├── useForgeResources.ts           # Gestion ressources
├── useForgeCrafting.ts            # Logique crafting
├── useForgeChaos.ts               # Actions chaos
├── useForgeCorruption.ts          # Système corruption
├── useForgePrestige.ts            # Système prestige
├── useForgePhysics.ts             # Physique Matter.js
├── useForgeAnimations.ts          # Animations GSAP
├── useForgeAudio.ts               # Sons et musique
└── useForgeTooltips.ts            # Gestion tooltips
```

### 11.3 Architecture Backend

```
server/api/forge/
├── state.get.ts                   # Récupère l'état complet
├── state.post.ts                  # Sauvegarde l'état
├── init.post.ts                   # Initialise un nouvel atelier
├── collect.post.ts                # Collecte les fragments
├── smelt.post.ts                  # Fond une carte
├── craft.post.ts                  # Craft une recette
├── chaos/
│   ├── reroll.post.ts             # Chaos reroll
│   ├── gamble.post.ts             # Chaos gamble
│   ├── discovery.post.ts          # Chaos discovery
│   └── amplify.post.ts            # Chaos amplify
├── corrupt.post.ts                # Corruption vaal
├── divine/
│   ├── bless.post.ts              # Bénédiction (tier up)
│   └── exalt.post.ts              # Exaltation (quality up)
├── experiment.post.ts             # Expérimentation recette
├── prestige.post.ts               # Effectue un prestige
├── challenges/
│   ├── current.get.ts             # Challenge actuel
│   ├── claim.post.ts              # Réclame récompense
│   └── history.get.ts             # Historique
└── leaderboard.get.ts             # Classement
```

### 11.4 Schema Base de Données

```sql
-- Table principale
CREATE TABLE forge_states (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),

  -- Progression
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  prestige_level INTEGER DEFAULT 0,

  -- Ressources
  fragments INTEGER DEFAULT 0,
  transmute_shards INTEGER DEFAULT 0,
  alteration_shards INTEGER DEFAULT 0,
  augment_shards INTEGER DEFAULT 0,
  exalted_shards INTEGER DEFAULT 0,
  chaos_orbs INTEGER DEFAULT 0,
  divine_shards INTEGER DEFAULT 0,
  vaal_orbs INTEGER DEFAULT 0,
  mirror_shards INTEGER DEFAULT 0,

  -- Limites
  actions_remaining INTEGER DEFAULT 10,
  last_collect_at TIMESTAMP,

  -- Buffs
  active_buff VARCHAR,
  buff_expires_at TIMESTAMP,
  active_curse VARCHAR,
  curse_expires_at TIMESTAMP,

  -- Découvertes
  discovered_recipes TEXT[] DEFAULT '{}',
  revealed_hints TEXT[] DEFAULT '{}',
  completed_tutorials TEXT[] DEFAULT '{}',

  -- Statistiques
  total_smelted INTEGER DEFAULT 0,
  total_crafted INTEGER DEFAULT 0,
  total_corruptions INTEGER DEFAULT 0,
  miracles_obtained INTEGER DEFAULT 0,
  cataclysms_endured INTEGER DEFAULT 0,

  -- Meta
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cartes de la forge
CREATE TABLE forge_cards (
  id UUID PRIMARY KEY,
  forge_state_id UUID REFERENCES forge_states(id),
  card_id VARCHAR NOT NULL,  -- Référence au catalogue
  tier VARCHAR NOT NULL,     -- T0, T1, T2, T3
  quality VARCHAR DEFAULT 'normal',  -- normal, superior, masterwork, foil
  quantity INTEGER DEFAULT 1,
  acquired_at TIMESTAMP DEFAULT NOW()
);

-- Historique des corruptions
CREATE TABLE forge_corruptions (
  id UUID PRIMARY KEY,
  forge_state_id UUID REFERENCES forge_states(id),
  outcome VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Challenges hebdomadaires
CREATE TABLE forge_challenges (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  objectives JSONB NOT NULL,
  rewards JSONB NOT NULL,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL
);

CREATE TABLE forge_challenge_progress (
  id UUID PRIMARY KEY,
  forge_state_id UUID REFERENCES forge_states(id),
  challenge_id UUID REFERENCES forge_challenges(id),
  progress JSONB DEFAULT '{}',
  claimed_rewards TEXT[] DEFAULT '{}',
  completed_at TIMESTAMP
);
```

---

## Conclusion

Cette refonte transforme La Forge d'un simple système de crafting en une **expérience incrémentale narrative complète**, inspirée des meilleurs du genre.

**Les clés du succès:**

1. **UN bouton au départ** - Le joueur n'est jamais submergé
2. **Révélation progressive** - Chaque déblocage est une célébration
3. **Risque croissant** - Le chaos et la corruption ajoutent de la tension
4. **Prestige satisfaisant** - Recommencer plus fort est gratifiant
5. **Boucles imbriquées** - Micro (5min), Macro (1sem), Meta (1mois)
6. **Feedback constant** - Sons, animations, particules à chaque action

**Prochaines étapes:**

1. Implémenter `useForgeProgression.ts` avec le système de phases
2. Ajouter l'état "dormant" et l'animation d'allumage
3. Créer les modals de déblocage de modules
4. Implémenter le système de tutoriels intégrés
5. Ajouter les sons et animations de feedback
6. Backend: tables et endpoints pour la persistance
7. Système de challenges hebdomadaires
8. Leaderboard et aspects sociaux

---

*Document créé le 18 décembre 2024*
*Basé sur l'analyse de Universal Paperclips, Cookie Clicker, et les meilleures pratiques des jeux incrémentaux*
