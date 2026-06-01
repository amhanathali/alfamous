# Migrer Alfamous vers un nouvel ordinateur

Ce guide explique comment réinstaller Alfamous sur un nouveau PC, **sans rien perdre**.

## Le principe à comprendre

Le projet se compose de **deux parties** qui se sauvegardent **différemment** :

| Partie | Sauvegardée où ? | Comment la restaurer |
|---|---|---|
| **Le code + l'historique** | Sur **GitHub** | `git clone` |
| **Les secrets + le dossier `other/`** (non versionnés) | Dans votre **snapshot `.rar`** (clé USB / cloud privé) | Copie manuelle |

> ⚠️ Git/GitHub **ne contient pas** vos secrets (`key.json`, `Gscript/secrets.gs`, clés `*-adminsdk-*.json`, `functions/client_secret*.json`, `functions/quick-login.json`, `.env`) ni le dossier `other/`. Ces éléments viennent **uniquement** de votre snapshot `.rar` (créé par `SAUVEGARDER____.BAT`).

## Procédure pas à pas

### 1. Installer les utilitaires

- [Node.js](https://nodejs.org/) **20+**
- [Git](https://git-scm.com/download/win)
- (Optionnel) [Firebase CLI](https://firebase.google.com/docs/cli) : `npm install -g firebase-tools`

> Après installation, **fermez et rouvrez** le terminal pour que `git` et `node` soient reconnus.

### 2. Récupérer le code depuis GitHub (clone)

```bash
git clone https://github.com/amhanathali/alfamous.git
cd alfamous
```

> `git clone` télécharge **tout le code, tout l'historique et le lien GitHub** en une seule commande. C'est l'étape qui remplace l'extraction du `.rar` pour le code.

### 3. Restaurer les secrets et `other/` depuis le snapshot `.rar`

Décompressez votre dernière archive `Sauvegarde_Alfamous_*.rar`, puis copiez **dans le dossier cloné** les éléments suivants (ceux que GitHub n'a pas) :

- `key.json`
- `.env` (s'il existe)
- `Gscript/secrets.gs`
- `functions/quick-login.json`
- `functions/<projet>-adminsdk-*.json`
- `functions/client_secret*.json`
- le dossier `other/` en entier

> 💡 Inutile d'écraser le code avec celui du `.rar` : le code à jour vient déjà du clone. On ne récupère du `.rar` que les fichiers **non versionnés**.

### 4. Réinstaller les dépendances

```bash
cd functions
npm install
cd ..
```

### 5. Reconnecter Firebase

```bash
firebase login
firebase use alfamous-amha
```

### 6. Vérifier

- Lancer l'aperçu local : `LANCER_ALFAMOUS.BAT`
- Vérifier l'état Git : `GIT_Etat_du_projet.bat`

## Au quotidien, ensuite

| Action | Outil |
|---|---|
| Récupérer les dernières modifications | `GIT_Recuperer_de_GitHub.bat` |
| Sauvegarder son travail sur GitHub | `GIT_Sauvegarder_sur_GitHub.bat` |
| Déployer en ligne (+ sauvegarde auto) | `DEPLOYER____.BAT` |
| Snapshot complet local (avec secrets) | `SAUVEGARDER____.BAT` |

## Checklist de migration

- [ ] Node.js et Git installés (terminal rouvert).
- [ ] `git clone` effectué.
- [ ] Secrets restaurés depuis le `.rar` (`key.json`, `secrets.gs`, clés `functions/`, `.env`).
- [ ] Dossier `other/` restauré.
- [ ] `npm install` dans `functions/`.
- [ ] `firebase login` + `firebase use`.
- [ ] Aperçu local OK.
