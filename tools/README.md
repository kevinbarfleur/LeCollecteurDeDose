# Outils Admin - Console Tools

Fonction cachée pour collecter les informations d'un utilisateur.

## Utilisation

Une fois sur l'application (et connecté avec Twitch), ouvrez la console du navigateur (F12) et tapez :

```javascript
getUserInfo();
```

La fonction retourne un objet simple :

```javascript
{
  twitch_user_id: '263566677',
  twitch_display_name: 'Orange_mecanique',
  is_active: true
}
```

## Processus d'ajout d'un admin

1. Demandez à votre collègue de se connecter sur l'application avec son compte Twitch
2. Demandez-lui d'ouvrir la console (F12) et de taper : `getUserInfo()`
3. Il vous enverra l'objet affiché
4. Ajoutez l'utilisateur dans Supabase avec ces informations

## Sécurité

Cette fonction ne modifie **jamais** la base de données. Elle affiche uniquement les informations de l'utilisateur connecté.
