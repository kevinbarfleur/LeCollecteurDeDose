# Vérification de Cohérence Globale - La Forge de l'Exilé

> **Document**: `specs/98_COHERENCE_CHECK.md`
> **Version**: 1.0
> **Date**: 2024-12
> **Statut**: Document de Validation

---

## 1. Matrice de Vérification

### 1.1 Cohérence des Niveaux de Déblocage

| Module | Niveau Déblocage | Phase | Vérifié |
|--------|-----------------|-------|---------|
| Le Fourneau | 1 | Awakening | ✅ |
| L'Atelier de Collecte | 1 | Apprentice | ✅ |
| L'Établi de Crafting | 5 | Artisan | ✅ |
| Le Sanctuaire du Chaos | 10 | Chaotic | ✅ |
| L'Autel de Corruption | 15 | Corrupted | ✅ |
| La Chambre Divine | 20 | Ascendant | ✅ |
| Le Panthéon de Prestige | 30 | Transcendent | ✅ |

**Résultat**: ✅ Progression linéaire cohérente (1 → 5 → 10 → 15 → 20 → 30)

---

### 1.2 Cohérence des Ressources

| Ressource | Source | Consommation | Balance |
|-----------|--------|--------------|---------|
| **Fragments** | Production passive (10+/h) | Conversion → Transmute | ✅ Équilibré |
| **Transmute Shards** | Fonte T3, Conversion | Craft Chaos, Recettes | ✅ Équilibré |
| **Alteration Shards** | Fonte T2 | Craft Chaos, Recettes | ✅ Équilibré |
| **Augment Shards** | Fonte T1 | Transmutation, Recettes | ✅ Équilibré |
| **Exalted Shards** | Fonte T0, Recettes | Exaltation, Recettes | ✅ Rare mais atteignable |
| **Divine Shards** | Recettes rares, Corruption | Bénédiction Divine | ✅ Très rare |
| **Chaos Orbs** | Craft (20 Trans ou 10 Alt) | Sanctuaire, Discovery | ✅ Économie centrale |
| **Vaal Orbs** | Recette #6, Miracle | Corruption | ✅ Risque/récompense |
| **Mirror Shards** | Prestige 5+, Recette #9 | Recette #15 (duplication) | ✅ Endgame |

**Résultat**: ✅ Cascade de ressources cohérente (simple → rare)

---

### 1.3 Cohérence des Coûts en Actions

| Action | Coût Actions | Module | Cohérence |
|--------|--------------|--------|-----------|
| Collecter Fragments | 0 | Collecte | ✅ Gratuit (passif) |
| Fondre une carte | 1 | Fourneau | ✅ Action basique |
| Craft une recette | 1 | Crafting | ✅ Action basique |
| Expérimenter | 1 | Crafting | ✅ Risque = même coût |
| Chaos Reroll | 2 | Chaos | ✅ +coût car risque |
| Chaos Gamble | 2 | Chaos | ✅ +coût car risque élevé |
| Chaos Discovery | 1 | Chaos | ✅ Révélation simple |
| Chaos Amplify | 2 | Chaos | ✅ +coût car puissant |
| Corruption Vaal | 1 | Corruption | ✅ Coût bas (Vaal est le vrai coût) |
| Bénédiction Divine | 2 | Divine | ✅ +coût car permanent |
| Exaltation | 2 | Divine | ✅ +coût car permanent |
| Transmutation | 2 | Divine | ✅ +coût car permanent |

**Résultat**: ✅ Actions basiques = 1, Actions avancées/risquées = 2

---

### 1.4 Cohérence du Système de Fonte

| Tier | Yield Attendu | Spec Fourneau | Spec Économie | Match |
|------|---------------|---------------|---------------|-------|
| T3 Normal | 3 Transmute | ✅ M1 §2.2 | ✅ Eco §5.1 | ✅ |
| T3 Superior | 4 Transmute (+50%) | ✅ M1 §2.2 | ✅ Eco §5.1 | ✅ |
| T3 Masterwork | 6 Transmute (+100%) | ✅ M1 §2.2 | ✅ Eco §5.1 | ✅ |
| T2 Normal | 2 Alt + 1 Trans | ✅ M1 §2.2 | ✅ Eco §5.1 | ✅ |
| T1 Normal | 2 Aug + 1 Alt | ✅ M1 §2.2 | ✅ Eco §5.1 | ✅ |
| T0 Normal | 1 Exalt + 1 Aug | ✅ M1 §2.2 | ✅ Eco §5.1 | ✅ |

**Résultat**: ✅ Yields identiques entre M1_FOURNEAU et 03_ECONOMY_RESOURCES

---

### 1.5 Cohérence des Recettes

| Recette | Spec Crafting | Spec Économie | Match |
|---------|---------------|---------------|-------|
| #basic_chaos_1 | 20 Trans → 1 Chaos | 20 Trans → 1 Chaos | ✅ |
| #basic_chaos_2 | 10 Alt → 1 Chaos | 10 Alt → 1 Chaos | ✅ |
| #6 (Vaal craft) | 20T + 20A → 1 Vaal | 20T + 20A → 1 Vaal | ✅ |
| #14 (Purification) | 3 Vaal → Reset + 5C | 3 Vaal → Reset + 5C | ✅ |

**Résultat**: ✅ Recettes cohérentes entre modules

---

### 1.6 Cohérence des Probabilités Corruption

| Outcome | Spec Corruption | Plan Original | Match |
|---------|-----------------|---------------|-------|
| RIEN | 30% | 30% | ✅ |
| BOOST | 25% | 25% | ✅ |
| JACKPOT | 15% | 15% | ✅ |
| MALÉDICTION | 15% | 15% | ✅ |
| CATACLYSME | 10% | 10% | ✅ |
| MIRACLE | 5% | 5% | ✅ |
| **Total** | **100%** | **100%** | ✅ |

**Résultat**: ✅ Probabilités cohérentes et totalisent 100%

---

### 1.7 Cohérence des Bonus de Prestige

| Prestige | Prod Bonus | Spec Prestige | Spec Progression | Match |
|----------|------------|---------------|------------------|-------|
| 1 | +25% | ✅ M7 §2.3 | ✅ Prog §4 | ✅ |
| 2 | +50% | ✅ M7 §2.3 | ✅ Prog §4 | ✅ |
| 3 | +75% | ✅ M7 §2.3 | ✅ Prog §4 | ✅ |
| 4 | +100% | ✅ M7 §2.3 | ✅ Prog §4 | ✅ |
| 5+ | +125%+ | ✅ M7 §2.3 | ✅ Prog §4 | ✅ |

**Résultat**: ✅ Progression de bonus cohérente

---

## 2. Vérification d'Isolation Base de Données

### 2.1 Tables Accédées en Lecture Seule

| Table | Accès | Modules Concernés | Vérifié |
|-------|-------|-------------------|---------|
| `users` | READ ONLY | Tous (récupération user_id) | ✅ |
| `unique_cards` | READ ONLY | Fourneau, Chaos, Divine (sélection cartes) | ✅ |

### 2.2 Tables Forge (CRUD Complet)

| Table | Opérations | Vérifié |
|-------|------------|---------|
| `forge_players` | CREATE, READ, UPDATE | ✅ |
| `forge_cards` | CREATE, READ, UPDATE, DELETE | ✅ |
| `forge_recipes` | CREATE, READ, UPDATE | ✅ |
| `forge_recipe_definitions` | READ | ✅ |
| `forge_unlocks` | CREATE, READ, UPDATE | ✅ |
| `forge_activity_logs` | CREATE, READ | ✅ |

### 2.3 Fonctions SQL - Vérification search_path

| Fonction | `SET search_path = public` | Vérifié |
|----------|---------------------------|---------|
| `forge_init_player` | ✅ | ✅ |
| `forge_smelt_card` | ✅ | ✅ |
| `forge_collect_fragments` | ✅ | ✅ |
| `forge_craft_recipe` | ✅ | ✅ |
| `forge_experiment` | ✅ | ✅ |
| `forge_chaos_action` | ✅ | ✅ |
| `forge_corrupt` | ✅ | ✅ |
| `forge_divine_action` | ✅ | ✅ |
| `forge_prestige` | ✅ | ✅ |

**Résultat**: ✅ Isolation DB respectée, aucune modification des tables existantes

---

## 3. Vérification des Types TypeScript

### 3.1 Types Partagés

```typescript
// Vérification que ces types sont utilisés de manière cohérente

type CardTier = 'T0' | 'T1' | 'T2' | 'T3'
// ✅ Utilisé dans: Fourneau, Crafting, Chaos, Divine, Prestige

type CardQuality = 'normal' | 'superior' | 'masterwork'
// ✅ Utilisé dans: Fourneau, Divine

type ShardType = 'transmute' | 'alteration' | 'augment' | 'exalted' | 'divine'
// ✅ Utilisé dans: Économie, Crafting, Divine

type ForgePhase = 'dormant' | 'awakening' | 'apprentice' | 'artisan' |
                  'chaotic' | 'corrupted' | 'ascendant' | 'transcendent' | 'eternal'
// ✅ Utilisé dans: Progression, tous les modules

type ChaosAction = 'reroll' | 'gamble' | 'discovery' | 'amplify'
// ✅ Utilisé dans: Chaos

type DivineAction = 'blessing' | 'exaltation' | 'transmutation'
// ✅ Utilisé dans: Divine
```

**Résultat**: ✅ Types cohérents entre modules

---

## 4. Vérification des Références Croisées

### 4.1 Références entre Documents

| Document Source | Référence | Document Cible | Vérifié |
|-----------------|-----------|----------------|---------|
| M1_FOURNEAU | §7 Références | 03_ECONOMY | ✅ |
| M2_COLLECTE | §7 Références | 03_ECONOMY | ✅ |
| M3_CRAFTING | §8 Références | 03_ECONOMY, 04_DATABASE | ✅ |
| M4_CHAOS | §8 Références | 03_ECONOMY, M3_CRAFTING | ✅ |
| M5_CORRUPTION | §9 Références | 03_ECONOMY, M4_CHAOS | ✅ |
| M6_DIVINE | §8 Références | 03_ECONOMY, M5_CORRUPTION | ✅ |
| M7_PRESTIGE | §9 Références | 02_PROGRESSION, M6_DIVINE | ✅ |

**Résultat**: ✅ Chaîne de références cohérente

---

## 5. Points d'Attention Identifiés

### 5.1 Points Validés

1. ✅ **Progression linéaire** - Les modules se débloquent dans un ordre logique
2. ✅ **Économie équilibrée** - Les ressources s'obtiennent et se consomment de manière cohérente
3. ✅ **Risque croissant** - Chaos (50%) < Corruption (25% négatif) = escalade du risque
4. ✅ **Isolation DB** - Aucune modification des tables users/unique_cards
5. ✅ **Actions limitées** - 10/jour pousse à des choix stratégiques
6. ✅ **Prestige rewards** - Les bonus justifient le reset

### 5.2 Recommandations Futures

1. **Équilibrage fin** - Tester les taux de production après implémentation
2. **Recettes supplémentaires** - Prévoir de l'espace pour des recettes événementielles
3. **Tutoriels** - Implémenter les tooltips dans l'ordre de progression
4. **Analytics** - Logger suffisamment pour ajuster l'économie post-launch

---

## 6. Checklist Finale

### 6.1 Documentation

- [x] README.md créé avec index
- [x] 00_GAME_DESIGN_ANALYSIS.md (analyse)
- [x] 01_MASTER_DESIGN_DOCUMENT.md (vision)
- [x] 02_PROGRESSION_SYSTEM.md (progression)
- [x] 03_ECONOMY_RESOURCES.md (économie)
- [x] 04_DATABASE_SCHEMA.md (DB)
- [x] M1_FOURNEAU.md (module 1)
- [x] M2_COLLECTE.md (module 2)
- [x] M3_CRAFTING.md (module 3)
- [x] M4_CHAOS.md (module 4)
- [x] M5_CORRUPTION.md (module 5)
- [x] M6_DIVINE.md (module 6)
- [x] M7_PRESTIGE.md (module 7)
- [x] 98_COHERENCE_CHECK.md (ce document)

### 6.2 Cohérence Technique

- [x] Niveaux de déblocage cohérents
- [x] Ressources équilibrées
- [x] Coûts en actions logiques
- [x] Yields de fonte identiques partout
- [x] Recettes cohérentes
- [x] Probabilités totalisent 100%
- [x] Bonus de prestige progressifs
- [x] Types TypeScript alignés
- [x] Références croisées valides
- [x] Isolation DB respectée

### 6.3 Prêt pour Implémentation

**STATUT GLOBAL**: ✅ **VALIDÉ**

La documentation est complète et cohérente. Le projet peut passer en phase d'implémentation.

---

## 7. Historique des Vérifications

| Date | Version | Vérificateur | Résultat |
|------|---------|--------------|----------|
| 2024-12 | 1.0 | Claude | ✅ Validé |
