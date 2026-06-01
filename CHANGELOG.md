# Journal des modifications

Tous les changements notables de ce projet sont documentés dans ce fichier.

Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et le projet suit le [versionnage sémantique](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté
- Publication initiale du projet en open source sous licence **GPL v3**.
- Documentation : `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`.
- Fichier `LICENSE` (GNU GPL v3).
- `.gitignore` et `.gitattributes` adaptés au projet.
- Fichiers d'exemple de configuration : `.env.example`, `functions/quick-login.example.json`.
- README enrichi : vision du projet, singularité (annotation multilingue des versets), capture d'écran.
- Dossier `docs/` : `ARCHITECTURE.md`, `DATA-MODEL.md`, `DEPLOYMENT.md`, `CONFIGURATION.md`, `ROADMAP.md`.
- `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1).
- Modèles GitHub : rapports de bug, propositions de fonctionnalité, gabarit de Pull Request.
- Version anglaise du README (`README.en.md`) avec sélecteur de langue FR/EN.
- Présentation enrichie des README (approche, modules SAWM/SALAT/CHOKR, écosystème, public visé), inspirée de la page « À propos ».
- Guide `docs/MIGRATION.md` pour réinstaller le projet sur un nouvel ordinateur.
- Scripts `.bat` d'aide Git (sauvegarde, récupération, état) ; `DEPLOYER` sauvegarde désormais sur GitHub ; `SAUVEGARDER` inclut tous les secrets.

### Sécurité
- Exclusion du suivi Git de tous les secrets (clés de service Firebase Admin,
  secret client OAuth, identifiants de connexion rapide, `key.json`).
- Déplacement de la clé API Blogger hors du code (`Gscript/ArticlesBlogHtml.gs`)
  vers un fichier local exclu `Gscript/secrets.gs` (modèle : `secrets.example.gs`).

---

> Les versions publiées seront listées ici au format `## [x.y.z] - AAAA-MM-JJ`.
