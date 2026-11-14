# Modèle de données (Cloud Firestore)

Ce document recense les **collections Firestore** utilisées par Alfamous, leur rôle et leurs règles d'accès principales. La source de vérité des règles reste le fichier [`firestore.rules`](../firestore.rules).

> Convention : « lecture publique » signifie `allow read: if true` ; « écriture authentifiée » signifie `allow write: if request.auth != null`.

## Collections principales

| Collection | Rôle | Lecture | Écriture |
|---|---|---|---|
| `messagesContact` | Messages du formulaire de contact (sans compte) | publique | création publique (schéma strict anti-spam) ; modif/suppr. authentifiée |
| `newsletterSubscribers` | Abonnés newsletter (docId = e-mail) | publique | création/màj publique avec validation de schéma |
| `newsletterCampaigns` | Campagnes newsletter (objet, contenu, statut) | — | gérée côté admin / Functions |
| `temoignages` | Témoignages soumis par les visiteurs | publique | création publique (`status: pending`) ; modération authentifiée |
| `forumMessages` | Fils de forum (publics ou privés) | publique sauf fils privés (auteur) | auteur du fil, ou tout compte connecté sur fils publics |
| `forumAuthorNotifications` | File de notifications de réponses (déclenche e-mail) | — | écrite par l'app, consommée par Cloud Function |
| `likes` | « J'aime » par appareil (clientId localStorage) | publique | création publique validée ; suppression libre |
| `likesCounters` | Compteurs agrégés de « J'aime » | publique | incrément/décrément validé (+1 / −1) |
| `demandeCollaborerLexique` | Profils des collaborateurs + **niveau** (rôle). Aucun mot de passe : il n'existe que dans Firebase Auth | propriétaire (e-mail vérifié) pour sa fiche ; liste réservée aux admins | propriétaire : nom, niveau demandé, compteur ; **niveau** : admin seulement (**niveau ≥ 3 = admin**) |
| `LiensMedias` | Liens de médias partagés | publique | authentifiée |
| `FavorisMedias` | Favoris médias des utilisateurs | publique | authentifiée |

## Présence & statistiques (temps réel)

| Collection | Rôle |
|---|---|
| `rtPresenceCounter` | Compteur global de présence |
| `rtPresenceTabs` | Onglets/sessions actives |
| `daily` | Statistiques journalières |
| `counters` | Compteurs divers |
| `clients` | Clients/appareils connus |
| `historiqueActions` | Journal d'actions |

Ces collections sont en **lecture publique** et **écriture authentifiée**.

## Règle « fourre-tout »

En complément des règles spécifiques, une règle finale s'applique à tout document non couvert :

```
match /{nomCollection}/{document=**} {
  allow read: if nomCollection != 'demandeCollaborerLexique';   // lecture publique sauf fiches membres
  allow write: if request.auth != null && (… exclut demandeCollaborerLexique, forumMessages …);
}
```

Dans Firestore, il suffit qu'**une** règle autorise pour que l'accès soit accordé : une collection aux règles strictes doit donc être **exclue** de ce fourre-tout, sinon il annule ses règles spécifiques. C'est le cas de `demandeCollaborerLexique` (lecture et écriture) et de `forumMessages` (écriture).

## Rôles & permissions

- L'**identité** provient de **Firebase Auth** (e-mail).
- Le **rôle** (niveau) est stocké dans `demandeCollaborerLexique` (champ `niveau`), modifiable **uniquement par un admin** (règles Firestore) ; il peut être reflété dans des *custom claims* Firebase Auth via la fonction `syncAuthFromDemandeCollaborerLexique`.
- **niveau ≥ 3** ⇒ actions d'administration (envoi de newsletter, synchronisation des comptes, etc.).
- Le **mot de passe** n'est connu que de Firebase Auth : il n'est jamais écrit dans Firestore (l'ancien champ `code` est supprimé par `functions/scripts/purge-codes-demande-collaborer.js`).

## Stockage de fichiers (Cloud Storage)

- Préfixe principal : `MesMedias/` (médias partagés, favoris).
- Audios générés (Text-to-Speech) : `MesMedias/audio/MesNotesTts/{uid}/…`.
- Règles : voir [`storage.rules`](../storage.rules).

## Schéma relationnel (simplifié)

```mermaid
erDiagram
    USER ||--o{ forumMessages : "écrit (mail)"
    USER ||--o{ temoignages : "soumet"
    USER ||--o{ FavorisMedias : "possède"
    demandeCollaborerLexique ||--|| USER : "niveau / rôle (mail)"
    forumMessages ||--o{ forumAuthorNotifications : "déclenche"
    newsletterCampaigns ||--o{ newsletterSubscribers : "cible"
    likes }o--|| likesCounters : "agrège"
```
