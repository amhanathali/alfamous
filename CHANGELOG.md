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

### Sécurité
- Exclusion du suivi Git de tous les secrets (clés de service Firebase Admin,
  secret client OAuth, identifiants de connexion rapide, `key.json`).
- Déplacement de la clé API Blogger hors du code (`Gscript/ArticlesBlogHtml.gs`)
  vers un fichier local exclu `Gscript/secrets.gs` (modèle : `secrets.example.gs`).

---

> Les versions publiées seront listées ici au format `## [x.y.z] - AAAA-MM-JJ`.
