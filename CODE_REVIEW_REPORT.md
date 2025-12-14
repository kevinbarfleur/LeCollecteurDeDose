# Rapport de Revue de Code - Problèmes Urgents Corrigés

Date: 2025-01-14

## Résumé Exécutif

Revue approfondie de la codebase suite aux récents développements sur la séparation des données (API/test), les écrans de replay et les animations d'outcome de Vaal Orbs. Plusieurs problèmes urgents ont été identifiés et corrigés.

## Problèmes Urgents Corrigés

### 1. ✅ Ref `dataSource` non utilisé dans `useAppSettings.ts`

**Problème** :
- Un ref local `dataSource` était déclaré ligne 17 mais jamais synchronisé avec le vrai `useDataSource()`
- Ce ref était initialisé à `'test'` par défaut mais n'était jamais utilisé correctement
- Le computed `dataSource` retournait ce ref local au lieu du vrai dataSource

**Impact** :
- Confusion dans le code
- Risque de désynchronisation entre les settings et le vrai mode de données
- Le computed retournait une valeur incorrecte

**Solution** :
- Suppression du ref local `dataSource`
- Utilisation directe du `dataSource` de `useDataSource()` via `currentDataSource`
- Suppression de la mise à jour du ref local dans `applySettingValue` pour `data_source`

**Fichier modifié** : `composables/useAppSettings.ts`

---

### 2. ✅ Duplication d'instance `useApi()` dans `useCollectionSync.ts`

**Problème** :
- Une instance de `useApi()` était créée en haut du composable (ligne 26)
- Une nouvelle instance était créée à l'intérieur de `updateCardCounts` (ligne 117)
- Cela pouvait causer des problèmes de réactivité et de duplication d'état

**Impact** :
- Risque de perte de réactivité
- Duplication inutile d'instances
- Potentiels problèmes de performance

**Solution** :
- Extraction de `fetchUserCollection` lors de la création initiale de `useApi()`
- Utilisation de cette instance unique dans toute la fonction `updateCardCounts`

**Fichier modifié** : `composables/useCollectionSync.ts`

---

### 3. ✅ Clarification de `setDataSourceSetting` dans `useAppSettings.ts`

**Problème** :
- La fonction `setDataSourceSetting` forçait toujours `source: 'api'` même si on passait `'test'`
- Le commentaire indiquait que c'était intentionnel pour la compatibilité, mais le code était confus
- Le ref local (maintenant supprimé) était mis à jour avec la valeur passée, créant une incohérence

**Impact** :
- Comportement inattendu
- Confusion pour les développeurs
- Risque de bugs futurs

**Solution** :
- Le ref local a été supprimé (voir problème #1)
- La fonction reste pour la compatibilité mais ne fait plus rien avec le ref local
- Le commentaire clarifie que le data source est maintenant géré par `useDataSource` via localStorage

**Fichier modifié** : `composables/useAppSettings.ts`

---

## Problèmes Non-Critiques Identifiés (Non Corrigés)

### 1. ⚠️ Gestion des timeouts dans les animations

**Observation** :
- Plusieurs `setTimeout` et `requestAnimationFrame` sont utilisés dans les animations
- Certains timeouts sont hardcodés (200ms, 400ms, etc.)
- Pas de cleanup systématique des timeouts

**Recommandation** :
- Considérer l'utilisation de constantes pour les durées d'animation
- Implémenter un système de cleanup pour éviter les fuites mémoire
- Documenter les durées d'animation

**Fichiers concernés** :
- `composables/useVaalOutcomes.ts`
- `composables/useDisintegrationEffect.ts`
- `composables/useReplayPlayer.ts`

---

### 2. ⚠️ Gestion d'erreurs dans les callbacks de sync

**Observation** :
- Les erreurs de sync sont loggées mais pas toujours affichées à l'utilisateur
- Un TODO existe dans `pages/altar.vue` ligne 893 pour afficher une notification toast

**Recommandation** :
- Implémenter un système de notifications toast pour les erreurs de sync
- Améliorer la gestion d'erreurs utilisateur-friendly

**Fichiers concernés** :
- `pages/altar.vue`
- `composables/useCollectionSync.ts`

---

### 3. ⚠️ Race conditions potentielles dans la synchronisation

**Observation** :
- Le document `API_COMPATIBILITY_ANALYSIS.md` mentionne des risques de race conditions
- La queue de synchronisation devrait empêcher cela, mais une vérification serait bénéfique

**Recommandation** :
- Vérifier l'implémentation de `enqueueWrite` côté serveur
- S'assurer que les écritures sont bien sérialisées
- Considérer l'ajout de verrous de fichier si nécessaire

**Fichiers concernés** :
- `server/api/data/[...].ts` (côté serveur)
- `composables/useSyncQueue.ts`

---

## Points Positifs Identifiés

### ✅ Architecture de séparation des données

- La séparation entre mode API et test est bien implémentée
- Les settings sont correctement séparés par `data_mode`
- La migration SQL a été correctement appliquée

### ✅ Gestion de la réactivité

- Les computed values sont bien utilisés pour la réactivité
- Les watch sont correctement configurés
- La synchronisation en temps réel fonctionne bien

### ✅ Gestion des erreurs

- Les erreurs sont généralement bien catchées
- Les logs sont détaillés et utiles pour le debugging
- Les rollbacks sont implémentés pour les mises à jour optimistes

---

## Recommandations Futures

1. **Tests** : Ajouter des tests unitaires pour les composables critiques
2. **Documentation** : Documenter les durées d'animation et les constantes de timing
3. **Monitoring** : Ajouter un monitoring des erreurs de sync côté production
4. **Performance** : Profiler les animations pour identifier les optimisations possibles

---

## Conclusion

Les problèmes urgents identifiés ont tous été corrigés. La codebase est maintenant plus cohérente et moins sujette aux bugs. Les problèmes non-critiques identifiés peuvent être traités progressivement lors des prochaines itérations.

