# La Forge de l'Exilé - Documentation Technique

> **Mini-jeu incrémental** inspiré de Universal Paperclips et Path of Exile

## Structure de la Documentation

```
docs/forge/
├── README.md                          # Ce fichier (index)
├── 00_GAME_DESIGN_ANALYSIS.md         # Analyse des jeux de référence
├── 01_MASTER_DESIGN_DOCUMENT.md       # Document de design principal
│
├── specs/
│   ├── 02_PROGRESSION_SYSTEM.md       # Système de progression et phases
│   ├── 03_ECONOMY_RESOURCES.md        # Économie et ressources
│   ├── 04_DATABASE_SCHEMA.md          # Schéma de base de données
│   └── 98_COHERENCE_CHECK.md          # Vérification de cohérence globale
│
├── modules/
│   ├── M1_FOURNEAU.md                 # Module 1: Le Fourneau
│   ├── M2_COLLECTE.md                 # Module 2: L'Atelier de Collecte
│   ├── M3_CRAFTING.md                 # Module 3: L'Établi de Crafting
│   ├── M4_CHAOS.md                    # Module 4: Le Sanctuaire du Chaos
│   ├── M5_CORRUPTION.md               # Module 5: L'Autel de Corruption
│   ├── M6_DIVINE.md                   # Module 6: La Chambre Divine
│   └── M7_PRESTIGE.md                 # Module 7: Le Panthéon de Prestige
│
└── 99_IMPLEMENTATION_TODO.md          # Liste des tâches d'implémentation
```

## Principes d'Architecture

### Isolation de la Base de Données

La Forge utilise ses **propres tables** et ne modifie JAMAIS les tables existantes:

| Accès | Tables | Actions Autorisées |
|-------|--------|-------------------|
| **Lecture seule** | `users`, `unique_cards` | SELECT uniquement |
| **Lecture/Écriture** | `forge_*` | Toutes opérations |

### Tables de la Forge

```sql
-- Tables créées pour la Forge (isolées)
forge_players          -- État du joueur dans la Forge
forge_cards            -- Cartes du mini-jeu (copies, pas références)
forge_unlocks          -- Cartes débloquées pour le joueur
forge_recipes          -- Recettes découvertes par joueur
forge_recipe_definitions -- Définitions statiques des recettes
forge_activity_logs    -- Historique des actions
```

### Références aux Tables Existantes

```sql
-- LECTURE SEULE - Ne jamais modifier
users.id               -- Pour identifier le joueur
users.twitch_username  -- Pour affichage
unique_cards.uid       -- Pour référencer les cartes du catalogue
unique_cards.tier      -- Pour les mécaniques de fonte
unique_cards.item_class -- Pour les recettes "même type"
```

## Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Vue 3 + Nuxt 3 |
| State | Pinia + Composables |
| Physique | Matter.js |
| Animations | CSS + GSAP |
| Backend | Nuxt Server API |
| Database | Supabase (PostgreSQL) |
| Auth | Via session existante |

## Flux de Données

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│  Supabase   │
│  (Vue/Nuxt) │◀────│ (Server API)│◀────│ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   └── Valide les actions
       │                   └── Calcule les résultats
       │                   └── Met à jour les états
       │
       └── Affiche l'UI
       └── Gère les animations
       └── Drag & drop physique
```

## Documents Liés

- **Design Principal**: [01_MASTER_DESIGN_DOCUMENT.md](./01_MASTER_DESIGN_DOCUMENT.md)
- **Analyse Game Design**: [00_GAME_DESIGN_ANALYSIS.md](./00_GAME_DESIGN_ANALYSIS.md)
- **Vérification Cohérence**: [specs/98_COHERENCE_CHECK.md](./specs/98_COHERENCE_CHECK.md)
- **TODO d'Implémentation**: [99_IMPLEMENTATION_TODO.md](./99_IMPLEMENTATION_TODO.md)

## Changelog

| Date | Version | Description |
|------|---------|-------------|
| 2024-12-18 | 1.0 | Création de la documentation initiale |
