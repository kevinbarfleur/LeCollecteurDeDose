# Système de Tests Automatisés

Ce système permet d'exécuter des tests automatisés depuis la console du navigateur pour vérifier le comportement des outcomes Vaal Orb et de la synchronisation API.

## Utilisation

### Depuis la console du navigateur

Une fois la page Altar chargée, le système de test est automatiquement initialisé. Vous pouvez utiliser les commandes suivantes :

```javascript
// Exécuter tous les scénarios de test
await window.runTests()

// Exécuter un scénario spécifique
await window.runTest('foil-transformation')
await window.runTest('duplicate')
await window.runTest('destroyed')
await window.runTest('transform')
await window.runTest('nothing')
await window.runTest('race-condition')

// Afficher le rapport de test
window.testReport()

// Vérifier le statut des tests
window.testStatus()
```

## Scénarios disponibles

### 1. `nothing`
Teste l'outcome NOTHING qui ne consomme pas de vaalOrb et ne modifie pas la collection.

### 2. `foil-transformation`
Teste l'outcome FOIL qui transforme une carte normale en foil et consomme 1 vaalOrb.

**Vérifications :**
- VaalOrbs diminué de 1
- Carte transformée en foil
- Comptes normal/foil corrects

### 3. `duplicate`
Teste l'outcome DUPLICATE qui duplique une carte et consomme 1 vaalOrb.

**Vérifications :**
- VaalOrbs diminué de 1
- Compte de la carte augmenté de 1
- Statut foil préservé

### 4. `destroyed`
Teste l'outcome DESTROYED qui détruit une carte et consomme 1 vaalOrb.

**Vérifications :**
- VaalOrbs diminué de 1
- Compte de la carte diminué de 1
- Carte retirée de la collection

### 5. `transform`
Teste l'outcome TRANSFORM qui transforme une carte en une autre du même tier et consomme 1 vaalOrb.

**Vérifications :**
- VaalOrbs diminué de 1
- Ancienne carte retirée
- Nouvelle carte ajoutée
- Statut foil préservé

### 6. `race-condition`
Teste plusieurs outcomes rapides pour vérifier que la queue de synchronisation fonctionne correctement.

**Vérifications :**
- Pas de conflits de synchronisation
- Toutes les opérations complétées

## Structure des tests

Chaque scénario de test suit cette structure :

```typescript
{
  name: 'scenario-name',
  description: 'Description du scénario',
  setup: async () => {
    // Préparation avant le test
    // Sauvegarde de l'état initial
  },
  execute: async () => {
    // Exécution du scénario
    // Simulation de l'outcome
  },
  assertions: [
    {
      name: 'Nom de la vérification',
      check: () => {
        // Vérification de l'état
        return true/false
      },
      expected: 'Description du résultat attendu'
    }
  ],
  cleanup: () => {
    // Nettoyage après le test
  }
}
```

## Ajouter un nouveau scénario

Pour ajouter un nouveau scénario de test :

1. Créez un nouveau scénario dans `test-scenarios/index.ts` :

```typescript
export const myNewScenario: TestScenario = {
  name: 'my-new-scenario',
  description: 'Description de mon nouveau scénario',
  setup: async () => {
    // Préparation
  },
  execute: async () => {
    // Exécution
  },
  assertions: [
    // Vérifications
  ],
  cleanup: () => {
    // Nettoyage
  }
}
```

2. Ajoutez-le à la liste `testScenarios` :

```typescript
export const testScenarios: TestScenario[] = [
  // ... autres scénarios
  myNewScenario,
]
```

3. Testez-le depuis la console :

```javascript
await window.runTest('my-new-scenario')
```

## Notes importantes

- Les tests attendent automatiquement la fin des animations avant de vérifier les résultats
- Les tests attendent la synchronisation API avant de vérifier les résultats
- Les tests sauvegardent l'état initial pour pouvoir faire des vérifications précises
- Les tests nettoient l'état après exécution pour éviter les effets de bord

## Dépannage

### Le test runner n'est pas initialisé
Assurez-vous que la page Altar est complètement chargée avant d'exécuter les tests.

### Les tests échouent
Vérifiez les logs de la console pour voir quelles assertions ont échoué. Les erreurs détaillées sont affichées pour chaque assertion.

### Les tests sont trop lents
Les tests attendent les animations et la synchronisation. C'est normal que cela prenne du temps. Vous pouvez ajuster les délais dans `useTestRunner.ts` si nécessaire.

