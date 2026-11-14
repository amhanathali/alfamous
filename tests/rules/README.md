# Tests des règles Firestore et Storage

Ces tests vérifient `firestore.rules` et `storage.rules` contre l'**émulateur Firebase**.
Ils ne touchent jamais au projet réel (`alfamous-amha`) : le projet utilisé est `demo-alfamous`,
un nom fictif que l'émulateur traite entièrement en local.

## Prérequis

- Node.js 20 ou plus récent
- Java 11 ou plus récent (requis par l'émulateur Firestore) : `java -version`
- Firebase CLI : `firebase --version` (sinon `npm install -g firebase-tools`)

## Lancer les tests

```bat
cd tests\rules
npm install
npm run test:emulateur
```

La commande démarre les émulateurs Firestore et Storage, exécute tous les fichiers
`*.test.js`, puis arrête les émulateurs. Chaque test affiche `✔` (réussi) ou `✖` (échec).
**Ne déployez les règles que si tous les tests sont au vert.**

## Fichiers

| Fichier | Ce qu'il vérifie |
|---|---|
| `firestore.demandeCollaborerLexique.test.js` | Fiches membres : pas de mot de passe, `niveau` réservé aux admins, lecture limitée au propriétaire |

## Ajouter un test

Chaque test décrit **qui** tente **quoi**, et si les règles doivent l'accepter (`assertSucceeds`)
ou le refuser (`assertFails`). Les rôles disponibles sont dans `helpers.js` :
`visiteur` (aucune session), `anonyme` (session anonyme), `compte` (e-mail vérifié),
`compteNonVerifie`.
