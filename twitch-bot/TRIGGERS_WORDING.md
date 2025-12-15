# 📝 Récapitulatif du Wording des Triggers Automatiques

Ce document liste tous les messages utilisés pour les triggers automatiques du bot Twitch, organisés par trigger avec leurs messages de succès et d'échec.

---

## ✨ 1. Blessing of RNGesus
**Effet** : Donne +1 Vaal Orb  
**Toujours possible** : Oui (donne quelque chose)

### Messages de Succès
- `✨ @{username} reçoit la bénédiction de RNGesus ! +1 Vaal Orb`

### Messages d'Échec
- `❌ Erreur lors de la bénédiction de RNGesus` (erreur technique uniquement)

---

## 🗺️ 2. Cartographer's Gift
**Effet** : Donne 1 carte aléatoire (non-foil)  
**Toujours possible** : Oui (donne quelque chose)

### Messages de Succès
- `🗺️ @{username} reçoit un cadeau du Cartographe ! +1 carte`

### Messages d'Échec
- `❌ Erreur lors du cadeau du Cartographe` (erreur technique uniquement)

---

## 💎 3. Mirror-tier Moment
**Effet** : Duplique une carte aléatoire  
**Toujours possible** : Non (nécessite des cartes)

### Messages de Succès
- `💎 @{username} vit un moment Mirror-tier ! Une carte a été dupliquée !`

### Messages d'Échec
- `💎 @{username} cherche un miroir... mais sa collection est vide.`

---

## 🦎 4. Einhar Approved
**Effet** : Convertit une carte normale en foil  
**Toujours possible** : Non (nécessite des cartes normales)

### Messages de Succès
- `🦎 Einhar approuve @{username} ! Une carte devient foil !`

### Messages d'Échec
- `🦎 Einhar regarde @{username}... mais ne trouve rien à approuver.`

---

## 💰 5. Heist Tax
**Effet** : Retire 1 Vaal Orb  
**Toujours possible** : Non (nécessite des Vaal Orbs)

### Messages de Succès
- `💰 @{username} a été taxé par Heist ! -1 Vaal Orb`

### Messages d'Échec
- `💰 @{username} n'a rien à voler... Heist repart bredouille.`

---

## 💀 6. Sirus Voice Line
**Effet** : Détruit une carte aléatoire  
**Toujours possible** : Non (nécessite des cartes)

### Messages de Succès
- `💀 "Die." - Sirus détruit une carte de @{username}`

### Messages d'Échec
- `💀 Sirus regarde @{username}... "Tu n'as rien à perdre."`

---

## ⚗️ 7. Alch & Go Misclick
**Effet** : Reroll une carte (remplace par une autre aléatoire)  
**Toujours possible** : Non (nécessite des cartes)

### Messages de Succès
- `⚗️ @{username} a fait un misclick ! Une carte a été rerollée`

### Messages d'Échec
- `⚗️ @{username} cherche une carte à reroll... mais sa collection est vide.`

---

## 🤝 8. Trade Scam
**Effet** : Transfère une carte à un autre joueur  
**Toujours possible** : Non (nécessite des cartes + un autre joueur actif)

### Messages de Succès
- `🤝 @{username} s'est fait scammer ! Une carte transférée à @{targetUsername}`

### Messages d'Échec
- `🤝 @{username} n'a personne à scammer... le scam échoue.` (pas d'autre joueur)
- `🤝 @{username} n'a rien à échanger... le scam échoue.` (pas de cartes ou erreur)

---

## 👓 9. Chris Wilson's Vision
**Effet** : Retire le foil d'une carte foil  
**Toujours possible** : Non (nécessite des cartes foil)

### Messages de Succès
- `👓 La vision de Chris Wilson frappe @{username} ! Le foil d'une carte a été retiré`

### Messages d'Échec
- `👓 Chris Wilson regarde @{username}... mais ne voit aucun foil à nerfer.`

---

## 🗺️ 10. Atlas Influence
**Effet** : Ajoute un buff temporaire (+10% chance de foil pendant 30min)  
**Toujours possible** : Oui (donne quelque chose)

### Messages de Succès
- `🗺️ @{username} reçoit l'influence de l'Atlas ! +{boostPercent}% chance de foil pendant {duration}min`
  - Exemple : `🗺️ @{username} reçoit l'influence de l'Atlas ! +10% chance de foil pendant 30min`

### Messages d'Échec
- `❌ Erreur lors de l'influence de l'Atlas` (erreur technique uniquement)

---

## 📊 Analyse du Wording

### Style Général
- **Tone** : Décontracté, gaming, référence à Path of Exile
- **Format** : Emoji + @username + message descriptif
- **Langue** : Français avec références anglaises (RNGesus, Mirror-tier, etc.)

### Cohérence des Messages d'Échec
Tous les messages d'échec suivent un pattern similaire :
- **Format** : Emoji + @username + description narrative de l'échec
- **Style** : Thématique, dans l'univers du jeu
- **Exemples** :
  - "cherche un miroir... mais sa collection est vide"
  - "n'a rien à voler... Heist repart bredouille"
  - "regarde @{username}... mais ne trouve rien"

### Points à Vérifier

1. **Cohérence des emojis** :
   - ✨ Blessing (positif)
   - 🗺️ Cartographer & Atlas (géographie/cartes)
   - 💎 Mirror-tier (précieux)
   - 🦎 Einhar (personnage PoE)
   - 💰 Heist (argent/vol)
   - 💀 Sirus (mort/destruction)
   - ⚗️ Alch (alchimie)
   - 🤝 Trade (échange)
   - 👓 Chris Wilson (vision/nerf)

2. **Références Path of Exile** :
   - ✅ RNGesus (communauté PoE)
   - ✅ Mirror-tier (Mirror of Kalandra)
   - ✅ Einhar (Bestiary Master)
   - ✅ Heist (League mechanic)
   - ✅ Sirus (Boss)
   - ✅ Chris Wilson (Créateur de PoE)
   - ✅ Atlas (endgame)

3. **Messages d'échec thématiques** :
   - Tous suivent une narration cohérente
   - Utilisent des phrases descriptives plutôt que des erreurs techniques
   - Maintiennent l'immersion dans l'univers du jeu

---

## 🔍 Suggestions d'Amélioration (si nécessaire)

### Messages qui pourraient être ajustés :

1. **Trade Scam** : 
   - Actuel : "s'est fait scammer" → pourrait être "s'est fait avoir" ou "s'est fait arnaquer"
   - Le mot "scammer" est en anglais, mais reste compréhensible

2. **Chris Wilson's Vision** :
   - Actuel : "nerfer" → terme gaming bien compris, mais pourrait être "nerf" (nom) ou "retirer le foil"

3. **Atlas Influence** :
   - Message très technique avec les pourcentages → pourrait être plus narratif si souhaité

---

## ✅ Conclusion

Le wording est globalement **cohérent** et **thématique** :
- ✅ Références Path of Exile bien intégrées
- ✅ Messages d'échec narratifs et immersifs
- ✅ Style décontracté adapté à Twitch
- ✅ Emojis cohérents avec chaque trigger
- ✅ Format uniforme pour tous les messages

Les seuls ajustements possibles seraient des préférences personnelles sur certains termes (scammer, nerfer) ou le niveau de technicité des messages (pourcentages dans Atlas Influence).
