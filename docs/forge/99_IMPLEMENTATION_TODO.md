# TODO d'Implémentation - La Forge de l'Exilé

> **Document**: `99_IMPLEMENTATION_TODO.md`
> **Version**: 1.0
> **Statut**: Liste de Tâches d'Implémentation

---

## Vue d'Ensemble

Ce document liste toutes les tâches d'implémentation avec des liens explicites vers les spécifications correspondantes.

**Légende:**
- 🔴 Non commencé
- 🟡 En cours
- 🟢 Terminé
- 📄 Lien vers spec

---

## Phase 1: Infrastructure Base

### 1.1 Base de Données

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Créer migration `forge_players` | P0 | 📄 [04_DATABASE_SCHEMA.md §2.1](./specs/04_DATABASE_SCHEMA.md#21-forge_players) | 🔴 |
| Créer migration `forge_cards` | P0 | 📄 [04_DATABASE_SCHEMA.md §2.2](./specs/04_DATABASE_SCHEMA.md#22-forge_cards) | 🔴 |
| Créer migration `forge_recipes` | P0 | 📄 [04_DATABASE_SCHEMA.md §2.3](./specs/04_DATABASE_SCHEMA.md#23-forge_recipes) | 🔴 |
| Créer migration `forge_recipe_definitions` | P0 | 📄 [04_DATABASE_SCHEMA.md §2.4](./specs/04_DATABASE_SCHEMA.md#24-forge_recipe_definitions) | 🔴 |
| Créer migration `forge_unlocks` | P0 | 📄 [04_DATABASE_SCHEMA.md §2.5](./specs/04_DATABASE_SCHEMA.md#25-forge_unlocks) | 🔴 |
| Créer migration `forge_activity_logs` | P0 | 📄 [04_DATABASE_SCHEMA.md §2.6](./specs/04_DATABASE_SCHEMA.md#26-forge_activity_logs) | 🔴 |
| Créer les politiques RLS | P0 | 📄 [04_DATABASE_SCHEMA.md §3](./specs/04_DATABASE_SCHEMA.md#3-politiques-rls) | 🔴 |
| Seed des recettes de base | P1 | 📄 [M3_CRAFTING.md §2.2](./modules/M3_CRAFTING.md#22-recettes-de-base) | 🔴 |
| Seed des recettes découvrables | P1 | 📄 [M3_CRAFTING.md §2.3](./modules/M3_CRAFTING.md#23-recettes-découvrables) | 🔴 |

### 1.2 Types TypeScript

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Créer `types/forge.ts` | P0 | 📄 [04_DATABASE_SCHEMA.md §5](./specs/04_DATABASE_SCHEMA.md#5-types-typescript) | 🔴 |
| Types ForgePlayer | P0 | 📄 [04_DATABASE_SCHEMA.md §5.1](./specs/04_DATABASE_SCHEMA.md#51-interfaces-principales) | 🔴 |
| Types ForgeCard | P0 | 📄 [04_DATABASE_SCHEMA.md §5.1](./specs/04_DATABASE_SCHEMA.md#51-interfaces-principales) | 🔴 |
| Types ForgeRecipe | P0 | 📄 [M3_CRAFTING.md §2.1](./modules/M3_CRAFTING.md#21-types-de-recettes) | 🔴 |
| Types CorruptionOutcome | P1 | 📄 [M5_CORRUPTION.md §2.1](./modules/M5_CORRUPTION.md#21-table-des-outcomes) | 🔴 |
| Générer types Supabase | P0 | Via `supabase gen types` | 🔴 |

---

## Phase 2: Module 1 - Le Fourneau

### 2.1 Backend

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Créer fonction SQL `forge_init_player` | P0 | 📄 [M1_FOURNEAU.md §5.1](./modules/M1_FOURNEAU.md#51-fonction-dinitialisation) | 🔴 |
| Créer fonction SQL `forge_smelt_card` | P0 | 📄 [M1_FOURNEAU.md §5.2](./modules/M1_FOURNEAU.md#52-fonction-de-fonte) | 🔴 |
| Créer endpoint `POST /api/forge/init` | P0 | 📄 [M1_FOURNEAU.md §4.1](./modules/M1_FOURNEAU.md#41-endpoint-dinitialisation) | 🔴 |
| Créer endpoint `POST /api/forge/smelt` | P0 | 📄 [M1_FOURNEAU.md §4.2](./modules/M1_FOURNEAU.md#42-endpoint-de-fonte) | 🔴 |
| Créer endpoint `GET /api/forge/state` | P0 | 📄 [M1_FOURNEAU.md §4](./modules/M1_FOURNEAU.md#4-backend) | 🔴 |

### 2.2 Frontend

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Créer `composables/useForgeState.ts` | P0 | 📄 [M1_FOURNEAU.md §6](./modules/M1_FOURNEAU.md#6-composable) | 🔴 |
| Créer `composables/useForgeSmelting.ts` | P0 | 📄 [M1_FOURNEAU.md §6](./modules/M1_FOURNEAU.md#6-composable) | 🔴 |
| Créer `composables/useForgeHeat.ts` | P1 | 📄 [M1_FOURNEAU.md §3](./modules/M1_FOURNEAU.md#3-système-de-chaleur) | 🔴 |
| Créer `ForgeVisualization.vue` | P0 | 📄 [M1_FOURNEAU.md §3.1](./modules/M1_FOURNEAU.md#31-forgevisualizationvue) | 🔴 |
| Créer `ForgeCrucible.vue` | P0 | 📄 [M1_FOURNEAU.md §3.4](./modules/M1_FOURNEAU.md#34-forgecruciblevue) | 🔴 |
| Créer `ForgeHeatMeter.vue` | P1 | 📄 [M1_FOURNEAU.md §3](./modules/M1_FOURNEAU.md#3-système-de-chaleur) | 🔴 |
| Animer les flammes CSS | P2 | 📄 [M1_FOURNEAU.md §3.2](./modules/M1_FOURNEAU.md#32-animations) | 🔴 |
| Animation d'allumage | P2 | 📄 [M1_FOURNEAU.md §3.3](./modules/M1_FOURNEAU.md#33-séquence-dallumage) | 🔴 |

---

## Phase 3: Module 2 - L'Atelier de Collecte

### 3.1 Backend

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Créer fonction SQL `forge_collect_fragments` | P0 | 📄 [M2_COLLECTE.md §4.2](./modules/M2_COLLECTE.md#42-fonction-sql) | 🔴 |
| Créer fonction SQL `forge_convert_fragments` | P0 | 📄 [M2_COLLECTE.md §5.2](./modules/M2_COLLECTE.md#52-endpoint) | 🔴 |
| Créer endpoint `POST /api/forge/collect` | P0 | 📄 [M2_COLLECTE.md §4.1](./modules/M2_COLLECTE.md#41-endpoint-de-collecte) | 🔴 |
| Créer endpoint `POST /api/forge/convert` | P1 | 📄 [M2_COLLECTE.md §5.2](./modules/M2_COLLECTE.md#52-endpoint) | 🔴 |

### 3.2 Frontend

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Créer `composables/useForgeCollection.ts` | P0 | 📄 [M2_COLLECTE.md §6](./modules/M2_COLLECTE.md#6-composable) | 🔴 |
| Créer `ForgeCollection.vue` | P0 | 📄 [M2_COLLECTE.md §3.1](./modules/M2_COLLECTE.md#31-forgecollectionvue) | 🔴 |
| Implémenter calcul production/h | P0 | 📄 [M2_COLLECTE.md §2.1](./modules/M2_COLLECTE.md#21-taux-de-production) | 🔴 |
| Barre de stockage avec animation | P1 | 📄 [M2_COLLECTE.md §3.1](./modules/M2_COLLECTE.md#31-forgecollectionvue) | 🔴 |

---

## Phase 4: Module 3 - L'Établi de Crafting

### 4.1 Backend

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Créer fonction SQL `forge_craft_recipe` | P0 | 📄 [M3_CRAFTING.md §6.1](./modules/M3_CRAFTING.md#61-craft-de-recette) | 🔴 |
| Créer fonction SQL `forge_experiment` | P0 | 📄 [M3_CRAFTING.md §6.2](./modules/M3_CRAFTING.md#62-expérimentation) | 🔴 |
| Créer fonction SQL `forge_chaos_discovery` | P0 | 📄 [M3_CRAFTING.md §6.3](./modules/M3_CRAFTING.md#63-chaos-discovery) | 🔴 |
| Créer endpoint `POST /api/forge/craft` | P0 | 📄 [M3_CRAFTING.md §5.1](./modules/M3_CRAFTING.md#51-endpoint-de-craft) | 🔴 |
| Créer endpoint `POST /api/forge/experiment` | P0 | 📄 [M3_CRAFTING.md §5.2](./modules/M3_CRAFTING.md#52-endpoint-dexpérimentation) | 🔴 |
| Créer endpoint `POST /api/forge/discover` | P1 | 📄 [M3_CRAFTING.md §5.3](./modules/M3_CRAFTING.md#53-endpoint-chaos-discovery) | 🔴 |

### 4.2 Frontend

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Créer `composables/useForgeCrafting.ts` | P0 | 📄 [M3_CRAFTING.md §7](./modules/M3_CRAFTING.md#7-composable) | 🔴 |
| Créer `ForgeCrafting.vue` | P0 | 📄 [M3_CRAFTING.md §4.1](./modules/M3_CRAFTING.md#41-forgecraftingvue) | 🔴 |
| Mode recettes connues | P0 | 📄 [M3_CRAFTING.md §4.1](./modules/M3_CRAFTING.md#41-forgecraftingvue) | 🔴 |
| Mode expérimentation | P1 | 📄 [M3_CRAFTING.md §3](./modules/M3_CRAFTING.md#3-mécanique-de-découverte) | 🔴 |
| Animation de découverte | P2 | 📄 [M3_CRAFTING.md §4.1](./modules/M3_CRAFTING.md#41-forgecraftingvue) | 🔴 |

---

## Phase 5: Module 4 - Le Sanctuaire du Chaos

### 5.1 Backend

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Créer fonction SQL `forge_chaos_action` | P0 | 📄 [M4_CHAOS.md §6](./modules/M4_CHAOS.md#6-fonction-sql-principale) | 🔴 |
| Créer fonction SQL `chaos_reroll_card` | P0 | 📄 [M4_CHAOS.md §6.1](./modules/M4_CHAOS.md#61-chaos-reroll) | 🔴 |
| Créer fonction SQL `chaos_gamble_card` | P0 | 📄 [M4_CHAOS.md §6.2](./modules/M4_CHAOS.md#62-chaos-gamble) | 🔴 |
| Créer fonction SQL `chaos_amplify_forge` | P1 | 📄 [M4_CHAOS.md §6.3](./modules/M4_CHAOS.md#63-chaos-amplify) | 🔴 |
| Créer endpoint `POST /api/forge/chaos` | P0 | 📄 [M4_CHAOS.md §5.1](./modules/M4_CHAOS.md#51-endpoint-principal) | 🔴 |

### 5.2 Frontend

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Créer `composables/useForgeChaos.ts` | P0 | 📄 [M4_CHAOS.md §7](./modules/M4_CHAOS.md#7-composable) | 🔴 |
| Créer `ForgeChaos.vue` | P0 | 📄 [M4_CHAOS.md §4.1](./modules/M4_CHAOS.md#41-forgechaosvue) | 🔴 |
| UI actions Chaos | P0 | 📄 [M4_CHAOS.md §2](./modules/M4_CHAOS.md#2-actions-du-sanctuaire) | 🔴 |
| Modal de confirmation gamble | P1 | 📄 [M4_CHAOS.md §4.1](./modules/M4_CHAOS.md#41-forgechaosvue) | 🔴 |
| Animations Chaos | P2 | 📄 [M4_CHAOS.md §4.1](./modules/M4_CHAOS.md#41-forgechaosvue) | 🔴 |

---

## Phase 6: Module 5 - L'Autel de Corruption

### 6.1 Backend

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Créer fonction SQL `forge_corrupt` | P0 | 📄 [M5_CORRUPTION.md §7](./modules/M5_CORRUPTION.md#7-fonction-sql) | 🔴 |
| Créer fonction SQL `calculate_corruption_weights` | P0 | 📄 [M5_CORRUPTION.md §7](./modules/M5_CORRUPTION.md#7-fonction-sql) | 🔴 |
| Créer fonction SQL `apply_corruption_effect` | P0 | 📄 [M5_CORRUPTION.md §7](./modules/M5_CORRUPTION.md#7-fonction-sql) | 🔴 |
| Créer endpoint `POST /api/forge/corrupt` | P0 | 📄 [M5_CORRUPTION.md §6.1](./modules/M5_CORRUPTION.md#61-endpoint-de-corruption) | 🔴 |
| Implémenter pity system | P1 | 📄 [M5_CORRUPTION.md §3](./modules/M5_CORRUPTION.md#3-pity-system) | 🔴 |

### 6.2 Frontend

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Créer `composables/useForgeCorruption.ts` | P0 | 📄 [M5_CORRUPTION.md §8](./modules/M5_CORRUPTION.md#8-composable) | 🔴 |
| Créer `ForgeCorruption.vue` | P0 | 📄 [M5_CORRUPTION.md §5.1](./modules/M5_CORRUPTION.md#51-forgecorruptionvue) | 🔴 |
| Tableau des probabilités | P0 | 📄 [M5_CORRUPTION.md §2.2](./modules/M5_CORRUPTION.md#22-probabilités) | 🔴 |
| Animation de corruption | P1 | 📄 [M5_CORRUPTION.md §5.1](./modules/M5_CORRUPTION.md#51-forgecorruptionvue) | 🔴 |
| Affichage buffs/malédictions | P1 | 📄 [M5_CORRUPTION.md §4](./modules/M5_CORRUPTION.md#4-buffs-et-malédictions) | 🔴 |
| Animation outcome dramatique | P2 | 📄 [M5_CORRUPTION.md §5.1](./modules/M5_CORRUPTION.md#51-forgecorruptionvue) | 🔴 |

---

## Phase 7: Module 6 - La Chambre Divine

### 7.1 Backend

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Créer fonction SQL `forge_divine_action` | P0 | 📄 [M6_DIVINE.md §6](./modules/M6_DIVINE.md#6-fonction-sql) | 🔴 |
| Créer fonction SQL `divine_blessing` | P0 | 📄 [M6_DIVINE.md §6](./modules/M6_DIVINE.md#6-fonction-sql) | 🔴 |
| Créer fonction SQL `divine_exaltation` | P0 | 📄 [M6_DIVINE.md §6](./modules/M6_DIVINE.md#6-fonction-sql) | 🔴 |
| Créer fonction SQL `divine_transmutation` | P0 | 📄 [M6_DIVINE.md §6](./modules/M6_DIVINE.md#6-fonction-sql) | 🔴 |
| Créer endpoint `POST /api/forge/divine` | P0 | 📄 [M6_DIVINE.md §5.1](./modules/M6_DIVINE.md#51-endpoint-principal) | 🔴 |

### 7.2 Frontend

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Créer `composables/useForgeDivine.ts` | P0 | 📄 [M6_DIVINE.md §7](./modules/M6_DIVINE.md#7-composable) | 🔴 |
| Créer `ForgeDivine.vue` | P0 | 📄 [M6_DIVINE.md §4.1](./modules/M6_DIVINE.md#41-forgedivinevue) | 🔴 |
| UI sélection de carte | P0 | 📄 [M6_DIVINE.md §4.1](./modules/M6_DIVINE.md#41-forgedivinevue) | 🔴 |
| Preview transformation | P1 | 📄 [M6_DIVINE.md §4.1](./modules/M6_DIVINE.md#41-forgedivinevue) | 🔴 |
| Animation divine | P2 | 📄 [M6_DIVINE.md §4.1](./modules/M6_DIVINE.md#41-forgedivinevue) | 🔴 |

---

## Phase 8: Module 7 - Le Panthéon de Prestige

### 8.1 Backend

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Créer fonction SQL `forge_prestige` | P0 | 📄 [M7_PRESTIGE.md §7.1](./modules/M7_PRESTIGE.md#71-exécution-du-prestige) | 🔴 |
| Créer fonction SQL `get_prestige_bonus` | P0 | 📄 [M7_PRESTIGE.md §7.1](./modules/M7_PRESTIGE.md#71-exécution-du-prestige) | 🔴 |
| Créer fonction SQL `create_starting_cards` | P0 | 📄 [M7_PRESTIGE.md §7.1](./modules/M7_PRESTIGE.md#71-exécution-du-prestige) | 🔴 |
| Créer fonction SQL `forge_get_leaderboard` | P1 | 📄 [M7_PRESTIGE.md §7.2](./modules/M7_PRESTIGE.md#72-leaderboard) | 🔴 |
| Créer fonction SQL `calculate_prestige_score` | P1 | 📄 [M7_PRESTIGE.md §7.2](./modules/M7_PRESTIGE.md#72-leaderboard) | 🔴 |
| Créer endpoint `POST /api/forge/prestige` | P0 | 📄 [M7_PRESTIGE.md §6.1](./modules/M7_PRESTIGE.md#61-endpoint-de-prestige) | 🔴 |
| Créer endpoint `GET /api/forge/leaderboard` | P1 | 📄 [M7_PRESTIGE.md §6.2](./modules/M7_PRESTIGE.md#62-endpoint-du-leaderboard) | 🔴 |

### 8.2 Frontend

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Créer `composables/useForgePrestige.ts` | P0 | 📄 [M7_PRESTIGE.md §8](./modules/M7_PRESTIGE.md#8-composable) | 🔴 |
| Créer `ForgePrestige.vue` | P0 | 📄 [M7_PRESTIGE.md §5.1](./modules/M7_PRESTIGE.md#51-forgeprestigevue) | 🔴 |
| Affichage conditions prestige | P0 | 📄 [M7_PRESTIGE.md §1.3](./modules/M7_PRESTIGE.md#13-conditions-de-prestige) | 🔴 |
| Preview bonus prochain prestige | P1 | 📄 [M7_PRESTIGE.md §2.3](./modules/M7_PRESTIGE.md#23-bonus-de-prestige-par-niveau) | 🔴 |
| Leaderboard UI | P1 | 📄 [M7_PRESTIGE.md §4](./modules/M7_PRESTIGE.md#4-score-de-prestige-et-leaderboard) | 🔴 |
| Animation de transcendance | P2 | 📄 [M7_PRESTIGE.md §5.1](./modules/M7_PRESTIGE.md#51-forgeprestigevue) | 🔴 |

---

## Phase 9: Intégration et Polish

### 9.1 Page Principale

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Créer `pages/forge.vue` | P0 | 📄 [01_MASTER_DESIGN_DOCUMENT.md](./01_MASTER_DESIGN_DOCUMENT.md) | 🔴 |
| Layout responsive | P0 | Design à définir | 🔴 |
| Navigation entre modules | P0 | 📄 [02_PROGRESSION_SYSTEM.md §2](./specs/02_PROGRESSION_SYSTEM.md#2-phases-de-progression) | 🔴 |
| Affichage ressources global | P0 | 📄 [03_ECONOMY_RESOURCES.md §2](./specs/03_ECONOMY_RESOURCES.md#2-hiérarchie-des-ressources) | 🔴 |

### 9.2 Système de Tooltips

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Créer `ForgeTooltip.vue` | P1 | 📄 [02_PROGRESSION_SYSTEM.md §5](./specs/02_PROGRESSION_SYSTEM.md#5-système-de-tooltips) | 🔴 |
| Créer `composables/useForgeTooltips.ts` | P1 | 📄 [02_PROGRESSION_SYSTEM.md §5](./specs/02_PROGRESSION_SYSTEM.md#5-système-de-tooltips) | 🔴 |
| Tooltips sur chaque module | P2 | 📄 [02_PROGRESSION_SYSTEM.md §5](./specs/02_PROGRESSION_SYSTEM.md#5-système-de-tooltips) | 🔴 |

### 9.3 Système d'Effets Visuels

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Créer `composables/useForgeEffects.ts` | P1 | Notifications et animations | 🔴 |
| Notifications toast | P1 | Style unifié | 🔴 |
| Animations de succès/échec | P2 | Par module | 🔴 |
| Particules et effets | P3 | Polish final | 🔴 |

### 9.4 Tutoriels et Onboarding

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Tutoriel Phase 0 (Allumage) | P1 | 📄 [02_PROGRESSION_SYSTEM.md §3](./specs/02_PROGRESSION_SYSTEM.md#3-système-de-tutoriels) | 🔴 |
| Tutoriel Phase 1 (Collecte) | P2 | 📄 [02_PROGRESSION_SYSTEM.md §3](./specs/02_PROGRESSION_SYSTEM.md#3-système-de-tutoriels) | 🔴 |
| Tutoriel déblocage modules | P2 | 📄 [02_PROGRESSION_SYSTEM.md §3](./specs/02_PROGRESSION_SYSTEM.md#3-système-de-tutoriels) | 🔴 |
| Objectifs affichés | P1 | 📄 [02_PROGRESSION_SYSTEM.md §4](./specs/02_PROGRESSION_SYSTEM.md#4-système-dobjectifs) | 🔴 |

---

## Phase 10: Tests et Équilibrage

### 10.1 Tests

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Tests unitaires fonctions SQL | P1 | Tous les modules | 🔴 |
| Tests API endpoints | P1 | Tous les endpoints | 🔴 |
| Tests composables | P2 | Tous les composables | 🔴 |
| Tests E2E parcours utilisateur | P2 | Flows principaux | 🔴 |

### 10.2 Équilibrage

| Tâche | Priorité | Spec | Status |
|-------|----------|------|--------|
| Valider taux de production | P1 | 📄 [03_ECONOMY_RESOURCES.md §3](./specs/03_ECONOMY_RESOURCES.md#3-production-passive) | 🔴 |
| Valider yields de fonte | P1 | 📄 [03_ECONOMY_RESOURCES.md §5](./specs/03_ECONOMY_RESOURCES.md#5-fonte-de-cartes) | 🔴 |
| Valider progression XP | P1 | 📄 [02_PROGRESSION_SYSTEM.md §2.2](./specs/02_PROGRESSION_SYSTEM.md#22-formule-dexpérience) | 🔴 |
| Valider probabilités corruption | P1 | 📄 [M5_CORRUPTION.md §2.2](./modules/M5_CORRUPTION.md#22-probabilités) | 🔴 |
| Ajuster si nécessaire | P2 | Post-tests | 🔴 |

---

## Résumé des Priorités

### P0 - Critique (Blocage)
- Infrastructure DB
- Types TypeScript
- Endpoints principaux
- Composants UI de base

### P1 - Important
- Fonctionnalités secondaires
- Tooltips
- Tutoriels
- Tests de base

### P2 - Souhaitable
- Animations avancées
- Tests E2E
- Polish visuel

### P3 - Nice to Have
- Effets de particules
- Micro-animations
- Optimisations performance

---

## Estimation de Temps

| Phase | Estimation | Dépendances |
|-------|------------|-------------|
| Phase 1: Infrastructure | 2-3 jours | Aucune |
| Phase 2: Fourneau | 2 jours | Phase 1 |
| Phase 3: Collecte | 1 jour | Phase 2 |
| Phase 4: Crafting | 2-3 jours | Phase 3 |
| Phase 5: Chaos | 2 jours | Phase 4 |
| Phase 6: Corruption | 2 jours | Phase 5 |
| Phase 7: Divine | 2 jours | Phase 6 |
| Phase 8: Prestige | 2-3 jours | Phase 7 |
| Phase 9: Intégration | 3-4 jours | Phases 1-8 |
| Phase 10: Tests | 2-3 jours | Phase 9 |

**Total estimé**: 20-25 jours de développement

---

## Notes

- Chaque lien `📄` pointe vers la section exacte de la spécification
- Les statuts seront mis à jour au fil du développement
- Les estimations peuvent varier selon la complexité réelle
- Consulter [98_COHERENCE_CHECK.md](./specs/98_COHERENCE_CHECK.md) pour la validation globale
