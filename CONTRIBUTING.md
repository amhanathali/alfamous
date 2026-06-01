# Contribuer à Alfamous

Merci de l'intérêt que vous portez à **Alfamous** ! Ce projet est open source sous licence **GPL v3** et toute contribution constructive est la bienvenue : code, documentation, traductions, signalement de bugs ou idées.

## 🧭 Code de conduite

Soyez respectueux et bienveillant. Les échanges doivent rester courtois, factuels et orientés vers l'amélioration du projet.

## 🐛 Signaler un bug

1. Vérifiez qu'une *issue* similaire n'existe pas déjà.
2. Ouvrez une nouvelle *issue* en décrivant :
   - le comportement attendu vs constaté ;
   - les étapes pour reproduire ;
   - votre environnement (navigateur, OS, version de Node, etc.) ;
   - captures d'écran ou messages d'erreur si possible.

## 💡 Proposer une amélioration

Ouvrez une *issue* « feature request » décrivant le besoin et l'usage visé avant de commencer à coder, afin d'en discuter.

## 🔧 Proposer du code (Pull Request)

1. **Forkez** le dépôt et créez une branche dédiée :
   ```bash
   git checkout -b feature/ma-fonctionnalite
   ```
2. Faites des commits **clairs et atomiques** (voir convention ci-dessous).
3. **Ne committez jamais de secrets** (clés, mots de passe, données personnelles). Vérifiez `git status` avant chaque commit.
4. Testez vos changements localement (`firebase emulators:start`).
5. Poussez votre branche et ouvrez une **Pull Request** vers `main` en décrivant vos changements.

## ✍️ Convention de messages de commit

Format recommandé (inspiré de *Conventional Commits*) :

```
<type>: <description courte à l'impératif>
```

Types courants :

| Type | Usage |
|---|---|
| `feat` | nouvelle fonctionnalité |
| `fix` | correction de bug |
| `docs` | documentation |
| `style` | mise en forme (sans impact fonctionnel) |
| `refactor` | refactorisation |
| `chore` | maintenance, configuration |

Exemple : `feat: ajout de la recherche par synonymes`

## 🎨 Style de code

- JavaScript : respecter la configuration ESLint présente dans `functions/`.
- Préférer un code lisible et commenté uniquement lorsque l'intention n'est pas évidente.
- Conserver la structure modulaire existante (`public/jsZC/`, `public/styles/`).

## 📜 Licence des contributions

En contribuant, vous acceptez que vos apports soient distribués sous la licence **GPL v3** du projet.

---

Merci de faire vivre et de préserver Alfamous. 🌱
