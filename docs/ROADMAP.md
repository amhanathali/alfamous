# Feuille de route (Roadmap)

Ce document partage la **vision d'évolution** d'Alfamous et propose des pistes de contribution. Il est volontairement ouvert : les priorités peuvent évoluer avec la communauté.

> 💡 Vous cherchez par où commencer ? Les éléments marqués 🌱 sont de bons **premiers contributions**.

## Vision à long terme

Faire d'Alfamous un **outil de référence, libre et pérenne** pour l'étude sémantique du Coran, maintenu par une communauté de passionné·e·s et de professionnel·le·s.

## Pistes d'amélioration

### Qualité & robustesse du code
- 🌱 Ajouter une configuration **ESLint/Prettier** partagée et l'appliquer au frontend.
- 🌱 Mettre en place une **CI GitHub Actions** (lint + vérifications de base).
- Découper/documenter les plus gros modules JS de `public/jsZC/`.
- Ajouter des **tests** (au moins pour la logique critique des Functions).

### Documentation
- 🌱 Traduire la documentation en **anglais** (toucher plus de contributeurs).
- Ajouter des **captures d'écran** et un court **GIF de démonstration**.
- Documenter le format des **données coraniques et du lexique**.

### Fonctionnalités
- Enrichir l'**annotation des versets** (fil de discussion, citations croisées).
- Améliorer la **recherche** (filtres, recherche floue, suggestions).
- Étendre les **traductions** disponibles et leur comparaison.
- Mode **hors-ligne** (PWA) plus complet.

### Données & licences
- Clarifier et documenter la **provenance et la licence** de chaque jeu de données (texte, traductions, lexique Ibn Fāris, médias).
- Fournir des **scripts d'import/export** reproductibles.

### Sécurité & exploitation
- Revue régulière des **règles Firestore/Storage**.
- Surveillance des **quotas** et des coûts Google Cloud.
- Documentation d'un **plan de sauvegarde/restauration**.

## Comment proposer une idée

1. Ouvrez une **issue** décrivant le besoin et l'usage visé.
2. Discutons-en avant de coder, surtout pour les changements structurants.
3. Consultez [CONTRIBUTING.md](../CONTRIBUTING.md) pour le processus de Pull Request.
