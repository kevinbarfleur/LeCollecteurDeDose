# The Pit — V1 T-Spec prête à implémenter

Version: V1.0  
Date: 2026-04-02  
Scope: mode PvE quotidien, jouable, data-driven, aligné sur `unique_cards_rows.csv` (506 cartes)

---

## 0. Objectif produit

Cette V1 doit être **un vrai jeu**, pas une démo de concepts.

Critères de succès :

1. Le mode quotidien est jouable en 3 à 5 minutes.
2. Le draft propose au moins 2 builds viables dans la majorité des cas.
3. Les cartes ont une cohérence lisible par classe, tier, motif et override.
4. Les joueurs avec petite collection peuvent remplir un loadout légal grâce au starter rack.
5. Les joueurs avancés ont assez de profondeur pour theorycrafter et lire les logs.
6. Le combat est déterministe, rejouable et résoluble côté serveur.

---

## 1. Contraintes réelles du dataset

Le dataset contient 506 cartes uniques. La répartition réelle impose la forme du mode.

| slot_family   |   cards | notes                                                                                    |
|:--------------|--------:|:-----------------------------------------------------------------------------------------|
| mainhand      |      49 | All weapons. One-handers may also be used in offhand; 2H/staff/warstaff disable offhand. |
| offhand       |      39 | Shield, Quiver, or any one-handed weapon. Disabled by 2H mainhand.                       |
| body          |      28 | Body Armour only.                                                                        |
| minor         |      40 | Helmet, Boots, Gloves.                                                                   |
| charm         |     250 | Ring, Amulet, Belt. Two charm slots are mandatory.                                       |
| focus         |     112 | Jewel, Abyss Jewel, Relic, Golden Mask, Dose Relic.                                      |
| tactical      |      12 | Map, Flask, Tincture. Optional but strong.                                               |

### Décision de design tirée des données

Le dataset est massivement dominé par les **Charms** et les **Focus**.  
Conséquence : la V1 ne doit pas rester sur un simple loadout anatomique à 6 slots, sinon on gaspille l’essentiel du catalogue.

### Loadout V1 retenu

Le loadout officiel V1 est :

- `Mainhand` — requis
- `Offhand` — conditionnel
- `Body` — requis
- `Minor` — requis
- `Charm A` — requis
- `Charm B` — requis
- `Focus` — requis
- `Tactical` — optionnel

### Règles de légalité

- `Mainhand` accepte toutes les armes.
- `Offhand` accepte `Shield`, `Quiver` ou une arme 1H.
- Si `Mainhand` est `Bow`, l’`Offhand` n’accepte que `Quiver`.
- Si `Mainhand` est `Two-Handed Sword`, `Two-Handed Axe`, `Staff` ou `Warstaff`, l’`Offhand` est désactivé.
- `Body` accepte uniquement `Body Armour`.
- `Minor` accepte `Helmet`, `Boots`, `Gloves`.
- `Charm A/B` acceptent `Ring`, `Amulet`, `Belt`.
- `Focus` accepte `Jewel`, `Abyss Jewel`, `Relic`, `Golden Mask`, `Dose Relic`.
- `Tactical` accepte `Map`, `Flask`, `Tincture`.
- Le joueur peut partir sans `Tactical`.
- Le joueur ne peut jamais partir sans `Mainhand`, `Body`, `Minor`, `Charm A`, `Charm B`, `Focus`.

### Pourquoi ce format

- Il utilise réellement le catalogue.
- Il garde un nombre de choix raisonnable.
- Il permet les vrais packages Ring + Ring / Ring + Amulet / Belt + Ring.
- Il donne une vraie place aux jewels/relics.
- Il laisse une place claire aux maps/flasks/tinctures sans les rendre obligatoires.

---

## 2. Ce qui est **dans** la V1 et ce qui est **hors scope**

### Dans la V1

- 3 boss : Kitava, Malachai, Sirus
- 1 modificateur quotidien
- 11 keywords
- 6 slots core + Offhand conditionnel + Tactical optionnel
- 55 overrides marquee (36 T0 + 19 T1 spotlight)
- starter rack
- leaderboard quotidien
- résolution serveur déterministe
- logs détaillés et replays

### Hors scope V1

- Foil / Synthesised comme système de variation compétitif
- scaling des ennemis par puissance du joueur
- 7e/8e slot débloqué par progression
- Endless
- PvP
- modificateurs dorés
- Stun pur “skip turn”
- plus de 3 boss
- progression donnant de la puissance brute sur le leaderboard

---

## 3. Boucle de jeu V1

1. Reset quotidien à 06:00 Europe/Paris.
2. Le serveur fixe :
   - `boss_id`
   - `daily_modifier_id`
   - `daily_seed`
   - `ruleset_version`
3. Le joueur reçoit un draft de 20 cartes depuis sa collection + starter fills si nécessaire.
4. Il compose son loadout.
5. Le serveur résout le combat.
6. Le client anime le log.
7. Score, leaderboard, récompense.

Durée cible :

- Draft + loadout : 1 à 3 min
- Combat : 90 à 180 s
- Résultat : < 20 s

---

## 4. Normalisation des classes

Chaque `item_class` brute est normalisée avant génération de stats et d’effets.

| normalized_class   | slots            | profile_id        | keyword_pool                |
|:-------------------|:-----------------|:------------------|:----------------------------|
| sword_1h           | mainhand|offhand | assault_balanced  | Strength/Vulnerable/Stagger |
| rapier_1h          | mainhand|offhand | tempo_duelist     | Dodge/Vulnerable/Strength   |
| axe_1h             | mainhand|offhand | assault_rend      | Strength/Vulnerable/Stagger |
| axe_2h             | mainhand         | heavy_execution   | Vulnerable/Strength/Stagger |
| mace_1h            | mainhand|offhand | control_crusher   | Stagger/Strength/Block      |
| claw               | mainhand|offhand | venom_leech       | Poison/Lifesteal/Dodge      |
| dagger             | mainhand|offhand | venom_burst       | Poison/Dodge/Vulnerable     |
| rune_dagger        | mainhand|offhand | occult_venom      | Poison/Burn/Foresight       |
| bow                | mainhand         | hunter_ranged     | Vulnerable/Dodge/Foresight  |
| wand               | mainhand|offhand | ember_caster      | Burn/Foresight/Dodge        |
| sceptre            | mainhand|offhand | ember_battlemage  | Burn/Strength/Foresight     |
| staff              | mainhand         | channel_guard     | Burn/Block/Foresight        |
| warstaff           | mainhand         | channel_control   | Stagger/Block/Burn          |
| shield             | offhand          | bastion_guard     | Block/Plating/Thorns        |
| body               | body             | bastion_shell     | Plating/Regen/Thorns        |
| helmet             | minor            | seer_helm         | Foresight/Plating/Burn      |
| boots              | minor            | tempo_stride      | Dodge/Foresight/Regen       |
| gloves             | minor            | tempo_grip        | Strength/Dodge/Lifesteal    |
| ring               | charm            | volatile_charm    | Poison/Burn/Strength        |
| amulet             | charm            | support_charm     | Regen/Lifesteal/Foresight   |
| belt               | charm            | sustain_charm     | Regen/Plating/Thorns        |
| jewel              | focus            | focus_engine      | Foresight/Burn/Poison       |
| abyss_jewel        | focus            | focus_engine      | Poison/Burn/Dodge           |
| relic              | focus            | relic_engine      | Foresight/Regen/Plating     |
| quiver             | offhand          | hunter_support    | Vulnerable/Dodge/Strength   |
| map                | tactical         | map_tactical      | MapMod                      |
| flask              | tactical         | flask_tactical    | Tactical                    |
| tincture           | tactical         | tincture_tactical | Tactical                    |

### Motifs lexicaux

Une deuxième couche de cohérence vient d’un `motif` détecté par le nom / flavour text.

| motif   | bias                                  |
|:--------|:--------------------------------------|
| ember   | Burn / Vulnerable / kill splash       |
| storm   | SPD / action meter / telegraph punish |
| frost   | Foresight / Plating / tempo défensif  |
| venom   | Poison / Lifesteal                    |
| blood   | Strength / Regen / risky sustain      |
| bastion | Block / Plating / Thorns              |
| insight | Foresight / PWR / reveals             |
| tempo   | SPD / Dodge / opener                  |
| void    | Poison + Burn / corruption            |
| beast   | HP / Strength / body pressure         |
| gamble  | Variance, boon/banes, score risk      |

Usage :

- la **classe** dicte le profil de stats et la primary keyword
- le **motif** biaise la secondary keyword, le trigger support, et la tonalité de l’override
- le **tier** contrôle la profondeur du package
- les **marquee overrides** prennent la priorité finale

---

## 5. Tiers et budget de carte

| tier   |   stat_base | keyword_package                                          | role                                   |
|:-------|------------:|:---------------------------------------------------------|:---------------------------------------|
| T3     |           4 | 1 primary faible, pas d’augment                          | remplissage cohérent, starter-friendly |
| T2     |           7 | 1 primary moyenne + trigger de profile                   | ossature des builds                    |
| T1     |          10 | 1 primary forte + 1 secondary faible + elite augment     | pivot de build                         |
| T0     |          13 | 1 primary forte + 1 secondary moyenne + override marquee | finisher / build-around                |

### Changement majeur par rapport au concept initial

En V1, **T3 a déjà une identité**.  
Sinon le mode devient trop plat pour les petits comptes et pour les drafts mixtes.

---

## 6. Stats et formules

### Stats de base du joueur

```ts
baseHP = 100
baseATK = 0
baseDEF = 0
baseSPD = 10
basePWR = 0
```

### Vecteurs de stats

Chaque classe normalisée applique un vecteur au `stat_base` du tier.

Exemples importants :

- `sword_1h` : ATK 1.6 / DEF 0.2 / HP 0 / SPD 0.5 / PWR 0.1
- `axe_2h` : ATK 2.3 / DEF 0 / HP 0.3 / SPD 0 / PWR 0.2
- `body` : DEF 1.8 / HP 1.3
- `shield` : DEF 1.7 / HP 0.7 / PWR 0.5
- `ring` : ATK 0.6 / SPD 0.3 / PWR 0.7
- `jewel` : PWR 1.8
- `relic` : DEF 0.2 / HP 0.2 / PWR 1.5

Le fichier `the_pit_v1_card_map.csv` contient le résultat concret pour les 506 cartes.

### Dégâts

```ts
raw = floor((ATK + flatBonus) * skillMultiplier * offensiveMultiplier)
mitigated = ceil(raw * 100 / (100 + DEF))
afterBlock = max(1, mitigated - blockAbsorbed)
```

### Action speed

Le moteur est déterministe à `tick = 100 ms`.

Chaque combattant possède une `actionMeter` de 0 à 100.

```ts
actionGainPerTick = (10 + SPD) / 10
```

Quand `actionMeter >= 100`, l’acteur exécute son action, puis retombe à 0.

### Ordre strict de résolution

```ts
1. preActionTriggers
2. targetSelection
3. dodgeCheck
4. rawDamage
5. defenseReduction
6. blockAndPlating
7. hpLoss
8. onHitStatusApply
9. lifestealThornsPostHit
10. deathsAndOnKill
11. hiddenEffectChecks
```

### Ticks périodiques

Toutes les 2 s :

- Poison tick
- Burn tick
- Regen tick
- buffs/debuffs with duration decrement

---

## 7. Keywords V1

| keyword    | rule                                                                                                   | base_values                    |
|:-----------|:-------------------------------------------------------------------------------------------------------|:-------------------------------|
| Strength   | +ATK additif. Stack permanent jusqu’à la fin de la vague.                                              | 1 / 2 / 3 / 4                  |
| Block      | Absorbe les dégâts directs. Cumul additif, cap 40. Expire à la fin de la vague sauf mention contraire. | 4 / 7 / 10 / 13                |
| Plating    | Block permanent jusqu’à destruction. Ne disparaît pas au tick.                                         | 3 / 5 / 7 / 9                  |
| Regen      | Toutes les 2 s, soigne le montant indiqué.                                                             | 2 / 3 / 4 / 5                  |
| Poison     | Toutes les 2 s, inflige X dégâts puis perd 1 stack. Max 20.                                            | 1 / 2 / 3 / 4                  |
| Burn       | Toutes les 2 s, inflige X dégâts qui ignorent Block. Dure 6 s et se refresh. Max 15.                   | 2 / 3 / 4 / 5                  |
| Vulnerable | La cible subit +30% de dégâts directs pendant la durée.                                                | 1.5 / 2.5 / 3.5 / 4.5 s        |
| Lifesteal  | Soigne un pourcentage des dégâts directs infligés.                                                     | 4 / 6 / 8 / 10 %               |
| Dodge      | Chance d’esquiver un hit direct. Cap global 40%.                                                       | 5 / 8 / 11 / 14 %              |
| Foresight  | Révèle la prochaine spéciale ennemie. Tant qu’une spéciale est télégraphiée, +5 SPD.                   | 2 / 3 / 4 / 5 s d’anticipation |
| Stagger    | Réduit la vitesse d’action cible de 15% pendant 2 s.                                                   | 1 / 1 / 2 / 2 stacks           |

### Evolved keywords (réservées aux overrides et au futur)

La V1 garde la place pour une couche “évoluée”, mais elle n’est pas un système global de variation.

- `Corrode` — Poison ignore 50% DEF
- `Inferno` — Burn spread / refresh fort
- `Fortress` — bonus au Block/Plating
- `Phase` — première attaque esquivée
- `Vampiric` — Lifesteal qui monte
- `Prophecy` — Foresight améliorée
- `Ruin` — Vulnerable réduit aussi DEF
- `Oppress` — Stagger affaiblit aussi l’ATK
- `Ferocity` — Strength s’empile plus vite

Ces keywords apparaissent seulement via overrides marquee en V1.

---

## 8. Profile behaviors

Le `profile_id` de la carte pilote son comportement de base.

| profile_id        | behavior                                                                                         |
|:------------------|:-------------------------------------------------------------------------------------------------|
| assault_balanced  | Attaque 1800 ms, 100% ATK. Si la cible n’est pas Vulnerable, 25% de chance de gagner Strength 1. |
| tempo_duelist     | Attaque 1400 ms, 75% ATK. Chaque 3e hit répète 40% de la frappe.                                 |
| assault_rend      | Attaque 1900 ms, 105% ATK. +20% dégâts si la cible a déjà un debuff.                             |
| heavy_execution   | Attaque 2400 ms, 150% ATK. Applique Vulnerable 1.                                                |
| control_crusher   | Attaque 2100 ms, 100% ATK. Applique Stagger 1.                                                   |
| venom_leech       | Attaque 1500 ms, 80% ATK. Applique Poison 1. +2% Lifesteal contre cibles empoisonnées.           |
| venom_burst       | Attaque 1300 ms, 70% ATK. Applique Poison 1. +20% dégâts sur cibles empoisonnées.                |
| occult_venom      | Attaque 1700 ms, 75% ATK. Alterne Poison 1 et Burn 1.                                            |
| hunter_ranged     | Attaque 1600 ms, 90% ATK. Première frappe sur une cible: Vulnerable 1.                           |
| ember_caster      | Attaque 1800 ms, 80% ATK. Applique Burn 1 + floor(PWR/20).                                       |
| ember_battlemage  | Attaque 1900 ms, 90% ATK. Applique Burn 1. Chaque 4e hit donne Foresight 2 s.                    |
| channel_guard     | Attaque 2000 ms, 85% ATK. Applique Burn 1 et gagne Block 2.                                      |
| channel_control   | Attaque 2100 ms, 90% ATK. Applique Stagger 1. Si la cible télégraphie, gagne PWR 1.              |
| bastion_shell     | Toutes les 8 s, gagne Plating 1 si HP > 50%, sinon Block 4.                                      |
| seer_helm         | Révèle la prochaine spéciale ennemie; tant qu’une spéciale est télégraphiée, +5 SPD.             |
| tempo_stride      | Chaque Dodge réussi donne +10 action meter.                                                      |
| tempo_grip        | Chaque 4e hit donne Strength 1 ou Lifesteal +2% pendant 3 s.                                     |
| bastion_guard     | Toutes les 6 s, gagne Block 5; quand le Block casse, gagne Thorns 2 pendant 4 s.                 |
| volatile_charm    | Petit proc conditionnel gouverné par le motif de la carte.                                       |
| support_charm     | Keyword de soutien au départ de vague ou sous condition de HP.                                   |
| sustain_charm     | Regen/Plating/Thorns selon motif, toutes les 8 s ou à l’overheal.                                |
| focus_engine      | Amplifie la primary keyword selon PWR. Premier trigger de la vague renforcé.                     |
| relic_engine      | Proc unique, plus swingy, parfois hidden.                                                        |
| hunter_support    | Toutes les 3 attaques, applique Vulnerable 1 ou +15% sur la prochaine attaque.                   |
| map_tactical      | Modificateur global de run; appliqué au début du combat.                                         |
| flask_tactical    | One-shot auto: boss start ou low HP selon la carte.                                              |
| tincture_tactical | Buff temporaire auto après 3 hits ou 1 kill.                                                     |

Règle de production :

- `Mainhand` utilise toujours le behavior offensif du profile
- `Offhand` apporte soit un support behavior, soit un follow-up si dual wield
- `Body` et `Minor` apportent des passifs / triggers réguliers
- `Charm` apporte du support conditionnel
- `Focus` agit comme amplificateur ou moteur de proc
- `Tactical` est un script autonome à activation automatique

---

## 9. Synergies V1

Les synergies V1 ajoutent des verbes, pas seulement des pourcentages.

| synergy            | condition                                               | bonus                                                                |
|:-------------------|:--------------------------------------------------------|:---------------------------------------------------------------------|
| Bulwark            | Body + Shield + carte Minor avec tag bastion            | Début de vague: Block 8. Quand le Block casse: Thorns 2 pendant 4 s. |
| Dual Wield         | Mainhand et Offhand = deux armes 1H                     | Offhand follow-up à 45% ATK, +12 SPD.                                |
| Two-Handed Mastery | Mainhand 2H/Staff/Warstaff et Offhand vide par règle    | +25% ATK, +10% max HP, +1 valeur à la primary keyword du mainhand.   |
| Bow Discipline     | Bow + Quiver                                            | Première attaque de chaque vague: Vulnerable 2. +15 SPD.             |
| Ember Conduit      | Mainhand ember_* + Focus + au moins 1 charm ember/storm | Burn +1 sur application et +15% Burn damage.                         |
| Venom Circuit      | Claw/Dagger/Rune Dagger + Focus + 1 charm venom/blood   | Poison ne décroit pas pendant les 4 premières secondes du boss.      |
| Ritual Link        | Amulet + Relic + carte Body sustain/support             | Regen +2 et les effets hidden se révèlent 1 trigger plus tôt.        |
| Mark Union         | Mark of the Elder + Mark of the Shaper équipés          | Toutes les 4 frappes, Focus Bolt gratuit à 75% puissance.            |

### Important

Pas de synergies de tier, pas de gros bonus Foil/Synth, pas de set bonuses mous type `+15% partout`.  
La V1 doit récompenser des **packages lisibles**.

---

## 10. Archétypes qui doivent réellement exister

| archetype            | core                                    | plan                                               | good_vs               | weak_vs                                |
|:---------------------|:----------------------------------------|:---------------------------------------------------|:----------------------|:---------------------------------------|
| Bulwark Bastion      | Shield + Body + Belt/Relic              | Survivre, temporiser, gagner sur Thorns/attrition. | Sirus                 | Kitava si DPS trop faible              |
| Dual Assault         | 1H + 1H + offensive charms              | Cadence élevée, Strength, pression continue.       | Kitava                | Gros reflect / Block                   |
| Two-Handed Execution | 2H sword/axe + burst charms             | Fenêtres de Vulnerable, gros coups rares.          | Kitava                | Malachai si trop dépendant d’une pièce |
| Venom Leech          | Claw/Dagger + Amulet/Ring + Focus       | Empiler Poison puis convertir en sustain.          | Malachai              | Sirus si pas assez de Dodge            |
| Ember Engine         | Wand/Sceptre/Staff + Jewel/Relic        | Burn scaling, clear stable, bons logs.             | Kitava                | Burst checks rapides                   |
| Hunter Tempo         | Bow + Quiver + Boots/Gloves             | Agir vite, opener, éviter les spikes.              | Sirus                 | Bastions très épais                    |
| Focus Reactor        | Jewel/Relic + Mark/Shaper package       | Proc chains, triggers, scaling caché.              | Sirus                 | Drafts pauvres en focus                |
| Gamble Chaos         | Ventor/Voidforge/Megalomaniac/custom T0 | Variance haute, gros score potentiel.              | Daily mods favorables | Runs réguliers                         |

### Cible de diversité

Sur une fenêtre de 7 jours de simulations :

- aucun archétype ne doit passer sous 8% de pick rate si le draft le propose
- aucun archétype ne doit dépasser 30% de win share en boss kill
- au moins 4 archétypes doivent être capables de tuer chaque boss avec un pool T2/T3 cohérent

---

## 11. Draft V1

### Taille

- 20 cartes
- 1 tentative par jour
- pas de reroll en V1 classée

### Quotas cibles

| family   |   count |
|:---------|--------:|
| Mainhand |       3 |
| Offhand  |       2 |
| Body     |       2 |
| Minor    |       3 |
| Charm    |       7 |
| Focus    |       2 |
| Tactical |       1 |

### Construction du draft

Pseudo-code :

```ts
function buildDailyDraft(playerPool, dailyBoss, dailyModifier, seed) {
  pool = normalize(playerPool + starterRackFills)

  anchorA = pickHighValueAnchor(pool, seed)
  anchorB = pickCompatibleOrCounterAnchor(pool, dailyBoss, anchorA, seed)

  draft = []
  draft += quotaFill(pool, 'Mainhand', 3, anchorA, anchorB)
  draft += quotaFill(pool, 'Offhand', 2, anchorA, anchorB)
  draft += quotaFill(pool, 'Body', 2, anchorA, anchorB)
  draft += quotaFill(pool, 'Minor', 3, anchorA, anchorB)
  draft += quotaFill(pool, 'Charm', 7, anchorA, anchorB)
  draft += quotaFill(pool, 'Focus', 2, anchorA, anchorB)
  draft += quotaFill(pool, 'Tactical', 1, anchorA, anchorB)

  draft = dedupeByUid(draft)
  draft = injectBossCounters(draft, dailyBoss)
  draft = injectWildcardIfAvailable(draft, seed)

  if (!passesValidation(draft, dailyBoss)) {
    return rebuildWithAlternateAnchors(...)
  }

  return draft
}
```

### Validation de draft

Le validateur énumère tous les loadouts légaux du draft.

Pour chacun, il calcule :

- `burstScore`
- `sustainScore`
- `controlScore`
- `rampScore`
- `bossCounterScore`
- `synergyScore`

Le draft est valide si :

1. au moins 2 loadouts dépassent `viability >= 100`
2. au moins 1 loadout a `bossCounterScore >= 20`
3. au moins 1 loadout peut remplir les 6 core slots sans starter fallback supplémentaire
4. les deux meilleurs loadouts ne reposent pas sur la même combinaison stricte de 4 cartes

### Pourquoi cette méthode

Avec 20 cartes, l’énumération exhaustive reste raisonnable.  
Elle garantit que le draft est **jouable** et pas seulement “thématiquement joli”.

---

## 12. Starter rack

Le starter rack n’est pas un placeholder. C’est un sous-système explicite.

Minimum V1 :

- `Pit Rustblade` — Mainhand T3 assault
- `Pit Fang Knife` — Offhand T3 venom
- `Pit Splinterguard` — Offhand T3 shield
- `Pit Split Quiver` — Offhand T3 quiver
- `Pit Patchcoat` — Body T3 bastion
- `Pit Raghelm` — Minor T3 insight
- `Pit Copper Loop` — Charm T3 strength
- `Pit Pilgrim Knot` — Charm T3 regen
- `Pit Plain Idol` — Focus T3 foresight
- `Pit Dull Phial` — Tactical T3 defensive flask

Règle :

- le starter rack ne rentre dans le draft que pour remplir des trous structurels
- il a des stats basses
- il ne porte jamais d’override marquee
- il garantit toujours un loadout légal

---

## 13. Boss V1

Le boss du jour a des stats fixes pour tout le monde.

| boss                     |   hp |   atk |   def |   spd | special                                                                                                                                |
|:-------------------------|-----:|------:|------:|------:|:---------------------------------------------------------------------------------------------------------------------------------------|
| Kitava, the Insatiable   |  320 |    19 |    16 |    14 | Toutes les 10 s, supprime le slot non-mainhand le plus faible pendant 6 s et se soigne de 8% HP max. Si aucun slot valide: Strength 2. |
| Malachai, the Nightmare  |  290 |    18 |    18 |    16 | Toutes les 12 s, corrompt la carte avec le plus de PWR pendant 8 s: -25% stats et Poison 2 sur le joueur.                              |
| Sirus, the Distant Storm |  280 |    21 |    14 |    18 | Toutes les 11 s, télégraphie 3 s puis lance Die Beam: 30 dégâts directs, ignore 50% du Block, applique Burn 2.                         |

### Vagues

#### Kitava
- Wave 1: 2 Gluttonous Spawn
- Wave 2: 2 Spawn + 1 Herald
- Boss: Kitava

#### Malachai
- Wave 1: 2 Nightmare Constructs
- Wave 2: 2 Constructs + 1 Piety elite
- Boss: Malachai

#### Sirus
- Wave 1: 2 Apparitions
- Wave 2: 2 Apparitions + 1 Storm Sentinel
- Boss: Sirus

### Philosophie

- Kitava punit le manque de tempo / de finisher
- Malachai punit les builds trop centrés PWR ou mono-carte
- Sirus punit les builds incapables de lire et d’absorber les specials

---

## 14. Modificateur quotidien

Un seul modificateur par jour en V1.

| modifier      | effect                                |
|:--------------|:--------------------------------------|
| Adrenaline    | +12 SPD au joueur.                    |
| Sanctified    | Regen +2 permanent.                   |
| Sharpened     | +15% dégâts directs.                  |
| Warded        | Début de vague: Block 6.              |
| Heavy Air     | -10 SPD.                              |
| Cursed Ground | -15 DEF.                              |
| Volatile      | Début de vague: Burn 2 sur le joueur. |
| Frailty       | -15 max HP.                           |

### Règle

- le modificateur est visible dès l’écran de draft
- le loadout analyzer doit expliquer ce que le mod change
- le mod ne doit jamais invalider un archétype entier à lui seul

---

## 15. Overrides marquee

Le fichier `the_pit_v1_overrides.csv` contient les 55 overrides V1.

Principe :

- Tous les T0 ont un override dédié.
- Un sous-ensemble de T1 a un override spotlight.
- Le reste du catalogue repose sur `profile + motif + tier package`.

### Règle de clarté

`clarity` peut valoir :

- `explicit` : texte complet en tooltip
- `implied` : texte court + détail en log/tooltip
- `hidden` : seule la phrase cryptique est visible; la mécanique exacte se déduit des logs et se révèle dans le codex après 3 déclenchements

### Budget de mystère

V1 ne doit pas avoir plus de 8 effets `hidden` réellement actifs.  
Le mystère doit enrichir le jeu, pas le rendre opaque.

---

## 16. UX / UI

### Écran Draft

Disposition recommandée :

- colonne gauche : draft
- centre : loadout
- droite : analyzer

Informations visibles en permanence :

- boss du jour
- modificateur du jour
- charge du build :
  - Burst
  - Sustain
  - Control
  - Ramp
- synergies actives
- alertes de contre-pick

### Analyzer

Le panneau de droite ne doit pas seulement afficher les stats brutes.

Il doit afficher :

- `Burst`
- `Sustain`
- `Control`
- `Ramp`
- `Boss Counter`
- `Archetype Guess`

### Combat

Éléments obligatoires :

- HP bars
- next special telegraph
- mainhand/offhand timers
- status badges
- log compact

### Log détaillé

Exemple :

```txt
00:12.4 The Saviour -> Kitava : 26
(base 18, skill x1.0, Vulnerable x1.3, DEF 16 -> 26)
+ Burn 2
```

### Hidden effects

Quand un effet hidden proc :

```txt
00:47.2 Glorious Vanity stirs.
Corruption spreads.
```

Le joueur comprend qu’il s’est passé quelque chose, sans obtenir la formule complète immédiatement.

---

## 17. Scoring et leaderboard

Le leaderboard est trié par tuple, pas uniquement par dégâts bruts.

### Tri

1. `boss_killed` desc
2. `waves_cleared` desc
3. `score` desc
4. `duration_ms` asc

### Score

```ts
clearBonus =
  wave1 ? 400 : 0 +
  wave2 ? 900 : 0 +
  bossKill ? 2000 : 0

speedBonus = clamp(600 - durationSec * 3, 0, 600)
hpBonus = hpRemaining * 4
styleBonus = min(400, keywordApplications * 8 + uniqueTriggers * 15)
underdogBonus = bossKill && noT0InCoreLoadout ? 250 : 0

score = clearBonus + speedBonus + hpBonus + styleBonus + underdogBonus
```

### Conséquence

- pas d’abus infini du damage dealt
- les runs propres et rapides sont valorisés
- le no-T0 peut exister comme exploit réel

---

## 18. Données et types

### Types minimaux

```ts
type PitSlotId =
  | 'mainhand'
  | 'offhand'
  | 'body'
  | 'minor'
  | 'charm1'
  | 'charm2'
  | 'focus'
  | 'tactical'

type PitKeywordId =
  | 'Strength'
  | 'Block'
  | 'Plating'
  | 'Regen'
  | 'Poison'
  | 'Burn'
  | 'Vulnerable'
  | 'Lifesteal'
  | 'Dodge'
  | 'Foresight'
  | 'Stagger'

interface PitCardDef {
  uid: number
  name: string
  rawItemClass: string
  normalizedClass: string
  tier: 'T3' | 'T2' | 'T1' | 'T0'
  allowedSlots: PitSlotId[]
  profileId: string
  motif: string
  stats: {
    atk: number
    def: number
    hp: number
    spd: number
    pwr: number
  }
  primaryKeyword: PitKeywordId | 'MapMod' | 'Tactical'
  secondaryKeyword?: PitKeywordId
  effectTier: 'simple' | 'major' | 'elite' | 'legendary'
  archetypeTags: string[]
  overrideEffectId?: string
}

interface PitLoadout {
  mainhand: number
  offhand?: number | null
  body: number
  minor: number
  charm1: number
  charm2: number
  focus: number
  tactical?: number | null
}

interface PitCombatResult {
  bossKilled: boolean
  wavesCleared: 0 | 1 | 2 | 3
  hpRemaining: number
  durationMs: number
  score: number
  log: PitEvent[]
  rulesetVersion: string
}
```

### Event stream

Le serveur retourne un event stream, pas juste un state final.

Événements minimaux :

- `hit`
- `damage`
- `status_add`
- `status_remove`
- `heal`
- `meter_gain`
- `special_telegraph`
- `special_fire`
- `gear_suppressed`
- `hidden_proc`
- `death`
- `wave_transition`

---

## 19. Architecture d’implémentation

### Source of truth

Un seul `pit-core` partagé entre client et serveur.

### Modules recommandés

- `pit/content/classProfiles.ts`
- `pit/content/keywords.ts`
- `pit/content/modifiers.ts`
- `pit/content/bosses.ts`
- `pit/content/overrides.ts`
- `pit/content/starterRack.ts`
- `pit/content/cardMap.generated.ts` ou import CSV
- `pit/core/draft.ts`
- `pit/core/loadout.ts`
- `pit/core/engine.ts`
- `pit/core/effects.ts`
- `pit/core/scoring.ts`
- `pit/core/replay.ts`

### API

- `GET /pit/daily-config`
- `POST /pit/draft`
- `POST /pit/resolve`
- `GET /pit/leaderboard?date=...`

### Persistance minimale

- `pit_daily_config`
- `pit_daily_drafts`
- `pit_results`
- `pit_progression`
- `pit_codex_discovery`

---

## 20. Balance targets

### Joueur starter
- clear wave 1 très souvent
- reach boss parfois
- boss kill rare mais possible sur bon mod/jour

### Joueur moyen
- boss kill ~35% à 55% selon cohérence du build

### Joueur avancé
- boss kill ~70% à 85%
- perfect runs possibles, mais pas automatiques

### Garde-fous

- aucun T0 ne doit être “mandatory” sur 7 jours
- aucun boss ne doit demander un seul archétype précis
- offhand shield, dual wield et 2H doivent tous être compétitifs

---

## 21. Tests obligatoires

### Unit tests
- damage order
- Poison/Burn/Regen ticking
- Block vs Plating
- hidden effect unlock
- offhand legality
- 2H offhand disable

### Simulation tests
- 10 000 drafts par boss
- distribution de loadouts viables
- taux de kill par archetype
- taux de présence par override marquee

### Acceptance tests
- un draft ne peut jamais être renvoyé sans loadout légal
- le replay client est identique au résultat serveur
- les logs affichent toutes les sources de dégâts et de status
- les hidden effects ne bloquent jamais la compréhension du combat de base

---

## 22. Ordre d’implémentation recommandé

### Sprint 1 — Core data
- normalisation des classes
- import `the_pit_v1_card_map.csv`
- slot legality
- starter rack
- draft quotas

### Sprint 2 — Combat
- engine déterministe
- 11 keywords
- profile behaviors
- scoring
- replay log

### Sprint 3 — Content
- 3 bosses
- 8 daily modifiers
- 36 T0 overrides
- 10 T1 overrides prioritaires

### Sprint 4 — UX
- draft/loadout/analyzer
- combat UI
- log expandable
- codex discovery pour hidden effects

### Sprint 5 — Balance
- harness de simulation
- tuning des bosses
- tuning des marquee
- leaderboard live

---

## 23. Décisions finales à figer

### À figer maintenant
- loadout structure
- keyword set
- action meter engine
- fixed boss stats
- no Foil/Synth V1 ranked
- no player-power progression in leaderboard

### À garder pour V1.5+
- Synthesised
- mode Endless
- second boss mod par jour
- PvP async
- extension de hidden tech

---

## 24. Livrables joints

1. `the_pit_v1_card_map.csv`
   - mapping des 506 cartes vers la V1
   - stats proposées
   - slots autorisés
   - profile, motif, keywords, tags, overrides

2. `the_pit_v1_overrides.csv`
   - 55 overrides marquee
   - trigger
   - summary
   - clarity
   - rôle de build
   - boss counter

Cette spec est volontairement plus stricte que le GDD d’exploration.  
Elle vise à rendre l’implémentation possible sans réinventer les règles à chaque fichier.
