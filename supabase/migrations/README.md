# Migrations Supabase

Ce dossier contient les migrations SQL pour la base de données Supabase.

## Migration: add_data_mode_to_app_settings.sql

Cette migration ajoute la colonne `data_mode` à la table `app_settings` pour permettre de stocker des settings séparés pour les modes de données API (production) et test.

### Ce que fait cette migration :

1. Ajoute la colonne `data_mode` avec une valeur par défaut `'api'` pour la compatibilité avec les données existantes
2. Modifie la clé primaire pour être composite sur `(key, data_mode)` au lieu de juste `key`
3. Migre les settings existants pour avoir `data_mode = 'api'`
4. Met à jour la fonction `update_app_setting` pour accepter le paramètre `setting_data_mode`

### Comment appliquer la migration :

1. Connectez-vous à votre projet Supabase
2. Allez dans l'éditeur SQL
3. Copiez-collez le contenu du fichier `add_data_mode_to_app_settings.sql`
4. Exécutez la migration

**Note importante** : Cette migration est sûre à exécuter même si vous avez déjà des données dans `app_settings`. Les settings existants seront automatiquement migrés vers le mode `'api'`.

### Après la migration :

- Les settings pour le mode API seront stockés avec `data_mode = 'api'`
- Les settings pour le mode test seront stockés avec `data_mode = 'test'`
- Le composable `useAppSettings()` retournera automatiquement les valeurs selon le mode de données actuel (`isTestData`)

