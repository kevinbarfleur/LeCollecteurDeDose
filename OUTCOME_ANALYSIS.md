# Analyse approfondie des Vaal Orb Outcomes

## Vue d'ensemble

Cette analyse examine tous les outcomes Vaal Orb pour vérifier leur comportement correct et identifier les edge cases potentiels.

---

## 1. NOTHING - Aucun effet

### Comportement attendu
- **VaalOrbs** : Aucune consommation (delta = 0)
- **Collection** : Aucun changement
- **API Sync** : Aucune synchronisation nécessaire

### Code actuel
```typescript
// useVaalOutcomes.ts:51-77
const executeNothing = async (): Promise<OutcomeResult> => {
  // Animation flash seulement
  // Pas d'appel à onSyncRequired
  return { success: true };
};
```

### ✅ Vérification
- ✅ Pas de consommation de vaalOrb
- ✅ Pas de modification de collection
- ✅ Pas de sync API (correct)

### Edge cases
- ✅ Aucun edge case critique

---

## 2. FOIL - Transformation en foil

### Comportement attendu
- **VaalOrbs** : Consomme 1 vaalOrb (delta = -1)
- **Collection** : 
  - Carte normale → foil (normal: -1, foil: +1)
  - La carte existante est modifiée (pas de nouvelle carte)
- **API Sync** : 
  - `normalDelta: -1, foilDelta: +1`
  - Envoie `cardData` avec `foil: true`

### Code actuel
```typescript
// useVaalOutcomes.ts:84-156
// 1. Modifie localCollection[index].foil = true
// 2. Appelle onSyncRequired avec normalDelta: -1, foilDelta: +1
```

### ✅ Vérification
- ✅ Consomme 1 vaalOrb correctement
- ✅ Modifie la carte existante (pas de duplication)
- ✅ Envoie les bons deltas à l'API
- ✅ Inclut cardData pour logging

### ⚠️ Edge cases identifiés

#### Edge case 1: Carte déjà foil
**Problème** : Que se passe-t-il si une carte foil reçoit l'outcome FOIL ?

**Protection actuelle** :
```typescript
// altar.vue:1163
if (isCurrentCardFoil.value) return; // Bloque le drag si carte foil
```

**✅ Résolu** : Le drag est bloqué si la carte est déjà foil.

#### Edge case 2: Carte unique normale → foil
**Scénario** : Une seule carte normale d'un UID, outcome FOIL.

**Comportement attendu** :
- Avant : `normal: 1, foil: 0`
- Après : `normal: 0, foil: 1`
- ✅ Le code gère correctement ce cas avec `normalDelta: -1, foilDelta: +1`

---

## 3. DESTROYED - Destruction de carte

### Comportement attendu
- **VaalOrbs** : Consomme 1 vaalOrb (delta = -1)
- **Collection** : 
  - Supprime une carte (normal: -1 OU foil: -1 selon le type)
  - La carte est retirée de `localCollection`
- **API Sync** : 
  - `normalDelta: -1, foilDelta: 0` OU `normalDelta: 0, foilDelta: -1`
  - Envoie `cardData` de la carte détruite

### Code actuel
```typescript
// altar.vue:736-791
const cleanupAfterDestruction = async (destroyedCardUid: number) => {
  // 1. Trouve la carte dans localCollection
  // 2. Retire la carte (splice)
  // 3. Calcule currentNormal/currentFoil APRÈS suppression
  // 4. Appelle handleSyncRequired avec les bons deltas
}
```

### ✅ Vérification
- ✅ Consomme 1 vaalOrb correctement
- ✅ Retire la carte de localCollection
- ✅ Calcule correctement les counts après suppression
- ✅ Envoie les bons deltas selon foil/normal

### ⚠️ Edge cases identifiés

#### Edge case 1: Dernière carte d'un UID détruite
**Scénario** : Une seule carte d'un UID (normal: 1, foil: 0), outcome DESTROYED.

**Comportement attendu** :
- Avant : `normal: 1, foil: 0`
- Après : `normal: 0, foil: 0` (carte retirée de l'API)
- ✅ Le code gère correctement : `normalDelta: -1` → `newNormal = max(0, 1-1) = 0`

#### Edge case 2: Carte foil détruite parmi plusieurs normales
**Scénario** : `normal: 3, foil: 1`, détruit la foil.

**Comportement attendu** :
- Avant : `normal: 3, foil: 1`
- Après : `normal: 3, foil: 0`
- ✅ Le code gère correctement : `foilDelta: -1` → `newFoil = max(0, 1-1) = 0`

#### Edge case 3: Compte négatif impossible
**Protection** :
```typescript
// collectionSync.ts:177
const newNormal = Math.max(0, currentNormal + normalDelta)
const newFoil = Math.max(0, currentFoil + foilDelta)
```
✅ Les comptes ne peuvent pas devenir négatifs.

---

## 4. TRANSFORM - Transformation en autre carte

### Comportement attendu
- **VaalOrbs** : Consomme 1 vaalOrb (delta = -1)
- **Collection** : 
  - Ancienne carte : normal: -1 OU foil: -1 (selon type)
  - Nouvelle carte : normal: +1 OU foil: +1 (préserve le statut foil)
  - Remplace la carte dans `localCollection[index]`
- **API Sync** : 
  - Ancienne carte : `normalDelta: -1, foilDelta: 0` OU `normalDelta: 0, foilDelta: -1`
  - Nouvelle carte : `normalDelta: +1, foilDelta: 0` OU `normalDelta: 0, foilDelta: +1`

### Code actuel
```typescript
// useVaalOutcomes.ts:178-354
// 1. Trouve une carte du même tier (exclut la carte actuelle)
// 2. Crée newCard avec foil préservé
// 3. Remplace localCollection[index] = newCard
// 4. Appelle onSyncRequired avec 2 updates (old: -1, new: +1)
```

### ✅ Vérification
- ✅ Consomme 1 vaalOrb correctement
- ✅ Préserve le statut foil
- ✅ Remplace la carte (pas de duplication)
- ✅ Envoie 2 updates (ancienne et nouvelle carte)

### ⚠️ Edge cases identifiés

#### Edge case 1: Aucune autre carte du même tier
**Scénario** : La carte est la seule de son tier.

**Protection actuelle** :
```typescript
// useVaalOutcomes.ts:192-195
if (sameTierCards.length === 0) {
  isAnimating.value = false;
  return { success: false, message: 'No other cards in this tier' };
}
```

**⚠️ PROBLÈME POTENTIEL** : Si `executeTransform()` retourne `success: false`, que se passe-t-il avec le vaalOrb ?

**Analyse** :
- Le code vérifie `sameTierCards.length === 0` AVANT de consommer le vaalOrb
- ✅ Pas de consommation si aucune carte disponible
- ✅ Retourne `success: false` avant toute modification

**✅ Résolu** : Le vaalOrb n'est pas consommé si aucune transformation possible.

#### Edge case 2: Transform d'une carte foil → nouvelle carte foil
**Scénario** : Carte foil transformée, nouvelle carte doit être foil.

**Comportement attendu** :
- Ancienne : `foilDelta: -1`
- Nouvelle : `foilDelta: +1`
- ✅ Le code préserve correctement : `newCard.foil = isCardFoil(currentCard)`

#### Edge case 3: Transform d'une carte normale → nouvelle carte normale
**Scénario** : Carte normale transformée.

**Comportement attendu** :
- Ancienne : `normalDelta: -1`
- Nouvelle : `normalDelta: +1`
- ✅ Le code gère correctement avec `isCardFoil(newCard) ? 1 : 0`

#### Edge case 4: Nouvelle carte déjà présente dans la collection
**Scénario** : Transform en une carte que l'utilisateur possède déjà.

**Comportement attendu** :
- L'ancienne carte est retirée (normal: -1 ou foil: -1)
- La nouvelle carte est ajoutée (normal: +1 ou foil: +1)
- Si la nouvelle carte existe déjà, le compte augmente correctement
- ✅ Le code envoie les deltas corrects, l'API gère le merge

---

## 5. DUPLICATE - Duplication de carte

### Comportement attendu
- **VaalOrbs** : Consomme 1 vaalOrb (delta = -1)
- **Collection** : 
  - Ajoute une copie de la carte (normal: +1 OU foil: +1 selon le type)
  - Préserve le statut foil
  - Ajoute une nouvelle instance à `localCollection` (avec UID unique)
- **API Sync** : 
  - `normalDelta: +1, foilDelta: 0` OU `normalDelta: 0, foilDelta: +1`
  - Envoie `cardData` de la carte originale

### Code actuel
```typescript
// useVaalOutcomes.ts:361-552
// 1. Crée duplicateCard avec UID unique (baseUid + decimal)
// 2. Ajoute à localCollection (push)
// 3. Appelle onSyncRequired avec normalDelta: +1 ou foilDelta: +1
```

### ✅ Vérification
- ✅ Consomme 1 vaalOrb correctement
- ✅ Ajoute une nouvelle instance à localCollection
- ✅ Préserve le statut foil
- ✅ Envoie les bons deltas selon foil/normal

### ⚠️ Edge cases identifiés

#### Edge case 1: Duplication d'une carte foil
**Scénario** : Carte foil dupliquée.

**Comportement attendu** :
- `foilDelta: +1` (pas de changement normal)
- ✅ Le code vérifie `isCardFoil(originalCard)` et envoie `foilDelta: 1`

#### Edge case 2: Duplication d'une carte normale
**Scénario** : Carte normale dupliquée.

**Comportement attendu** :
- `normalDelta: +1` (pas de changement foil)
- ✅ Le code vérifie et envoie `normalDelta: 1`

#### Edge case 3: UID unique pour duplication locale
**Scénario** : La duplication crée un UID avec décimal pour l'affichage local.

**Comportement** :
```typescript
// useVaalOutcomes.ts:377
uid: baseUid + (Date.now() % 1000000) * 0.0001
```

**✅ Correct** : 
- L'UID local est unique pour l'affichage
- Le `baseUid` est utilisé pour la sync API (via `Math.floor(uid)`)
- L'API reçoit le bon `baseUid` pour incrémenter le compte

---

## 6. Synchronisation avec l'API

### Flux de synchronisation

1. **Modification locale** (optimistic update)
   - `localCollection` est modifié immédiatement
   - `vaalOrbs` est décrémenté immédiatement

2. **Calcul des counts après modification**
   ```typescript
   // altar.vue:645-647
   const matchingCards = localCollection.value.filter(c => Math.floor(c.uid) === baseUid);
   const currentNormal = matchingCards.filter(c => !c.foil).length;
   const currentFoil = matchingCards.filter(c => c.foil).length;
   ```

3. **Envoi à l'API**
   - Récupère la collection actuelle depuis l'API
   - Applique les deltas pour calculer les nouvelles valeurs absolues
   - Envoie la collection complète avec les nouvelles valeurs

### ⚠️ Problèmes identifiés et corrigés

#### Problème 1: Double décrémentation de vaalOrbs ✅ CORRIGÉ
**Problème** : `vaalOrbs.value--` dans `endDragOrb` + décrémentation dans `handleSyncRequired`.

**Solution** : Suppression de `vaalOrbs.value--` dans `endDragOrb` (ligne 1321).

#### Problème 2: Calcul incorrect des currentNormal/currentFoil
**Analyse** : Le code calcule `currentNormal` et `currentFoil` APRÈS la modification locale, ce qui est correct car ce sont les nouvelles valeurs absolues.

**✅ Correct** : Les valeurs sont calculées après modification, donc elles représentent les nouvelles valeurs absolues.

#### Problème 3: Entrées dupliquées dans l'API (Orange_mecanique vs orange_mecanique)
**Problème** : Le serveur peut avoir deux entrées pour le même utilisateur avec des casings différentes.

**Solution** : 
- `fetchUserCollection` préfère maintenant la clé en minuscules
- Les mises à jour utilisent toujours la clé en minuscules

**✅ Partiellement résolu** : Le code lit maintenant la bonne entrée, mais le serveur devrait normaliser les clés.

---

## 7. Edge cases généraux

### Edge case 1: VaalOrbs = 0
**Protection** :
```typescript
// altar.vue:1159
if (vaalOrbs.value <= 0) return; // Bloque le drag
```

**✅ Résolu** : Le drag est bloqué si vaalOrbs = 0.

### Edge case 2: Pas de carte sur l'autel
**Protection** :
```typescript
// altar.vue:1160
if (!isCardOnAltar.value) return;
```

**✅ Résolu** : Le drag est bloqué si aucune carte sur l'autel.

### Edge case 3: Animation en cours
**Protection** :
```typescript
// altar.vue:1161
if (isAnimating.value) return;
```

**✅ Résolu** : Le drag est bloqué pendant les animations.

### Edge case 4: Échec de synchronisation
**Comportement actuel** :
- Les modifications locales restent (optimistic update)
- Un log d'erreur est affiché
- L'utilisateur peut réessayer manuellement

**⚠️ AMÉLIORATION POSSIBLE** : 
- Rollback des modifications locales en cas d'échec
- Retry automatique avec backoff exponentiel
- Notification utilisateur visible

### Edge case 5: Race condition (plusieurs outcomes rapides)
**Scénario** : L'utilisateur lance plusieurs outcomes rapidement.

**Protection actuelle** :
- `isAnimating.value` bloque les nouveaux drags
- `isSyncing.value` pourrait être utilisé pour bloquer pendant la sync

**⚠️ AMÉLIORATION POSSIBLE** :
- Queue des syncs pour éviter les conflits
- Lock pendant la synchronisation

### Edge case 6: Carte supprimée pendant la sync
**Scénario** : Une carte est supprimée localement, mais la sync échoue et la carte réapparaît après reload.

**Comportement actuel** :
- Après reload, la collection reflète l'état du serveur
- Si la sync a échoué, la carte réapparaît (comportement attendu)

**✅ Correct** : Le reload garantit la cohérence avec le serveur.

---

## 8. Résumé des vérifications

### ✅ Comportements corrects
1. ✅ NOTHING : Pas de consommation, pas de sync
2. ✅ FOIL : Consomme 1, transforme normale→foil, sync correcte
3. ✅ DESTROYED : Consomme 1, supprime carte, sync correcte
4. ✅ TRANSFORM : Consomme 1, remplace carte, préserve foil, sync correcte
5. ✅ DUPLICATE : Consomme 1, ajoute copie, préserve foil, sync correcte
6. ✅ VaalOrbs : Décrémentation unique (corrigé)
7. ✅ Comptes négatifs : Protégés par `Math.max(0, ...)`
8. ✅ Carte foil : Bloquée pour outcome FOIL
9. ✅ VaalOrbs = 0 : Bloqué

### ⚠️ Améliorations possibles
1. ⚠️ Gestion d'erreur : Rollback en cas d'échec de sync
2. ⚠️ Race conditions : Queue de sync pour éviter les conflits
3. ⚠️ Retry automatique : Avec backoff exponentiel
4. ⚠️ Normalisation serveur : Éliminer les entrées dupliquées (Orange_mecanique vs orange_mecanique)

### 🔴 Problèmes critiques
**Aucun problème critique identifié.** Tous les outcomes fonctionnent correctement avec les protections appropriées.

---

## 9. Tests recommandés

### Tests unitaires
1. ✅ Test `executeNothing` : Vérifier qu'aucune modification n'est faite
2. ✅ Test `executeFoil` : Vérifier normal→foil, consommation vaalOrb
3. ✅ Test `executeDestroyed` : Vérifier suppression, consommation vaalOrb
4. ✅ Test `executeTransform` : Vérifier remplacement, préservation foil
5. ✅ Test `executeDuplicate` : Vérifier duplication, préservation foil

### Tests d'intégration
1. ✅ Test sync API : Vérifier que les deltas sont corrects
2. ✅ Test reload : Vérifier que la collection reflète l'état serveur
3. ✅ Test edge cases : VaalOrbs=0, carte unique, etc.

### Tests manuels
1. ✅ Tester chaque outcome avec différentes configurations
2. ✅ Tester les edge cases identifiés
3. ✅ Tester la synchronisation avec l'API réelle

---

## Conclusion

**Le code est globalement correct et couvre la plupart des edge cases.** Les principales améliorations suggérées concernent la gestion d'erreur et la prévention des race conditions, mais ce ne sont pas des problèmes critiques.

**Statut global : ✅ VALIDE**

