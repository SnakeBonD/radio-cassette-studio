# SnakeBonD — Radio Cassette Studio

Projet indépendant réunissant la radio Internet, les cassettes personnalisées et le studio de création vidéo.

## Démarrage local

Node.js 22 ou supérieur, avec npm ou pnpm.

```sh
npm install
npm run build
npm test
npm start
```

- Radio et Cassette : http://127.0.0.1:4173/
- Studio : http://127.0.0.1:4173/studio.html
- Le menu commun permet de passer entre les trois modes. Le retour depuis le studio sauvegarde le brouillon et reprend ses pistes.

## Fonctionnalités

- Radio : sept stations années 80 proposées au démarrage, recherche par nom, favoris locaux, commandes communes.
- Cassette : import audio et tags, pochettes, modèles Originale et Années 80, quatorze finitions, bande animée selon la lecture.
- Studio : montage, fondus, exports portrait 720p/1080p, projets locaux et jukebox. Noms vidéo : ARTIST - TITLE (YEAR).
- Mise en page adaptée aux téléphones et aux écrans horizontaux ; bannière commune.

Les projets et fichiers audio sont conservés dans le navigateur (IndexedDB), selon les options du studio. Les recherches de métadonnées transmettent artiste, titre et éventuellement album à MusicBrainz / Cover Art Archive. Aucun fichier audio local n’est envoyé pour ces recherches. Les radios nécessitent une connexion aux diffuseurs et à Radio Browser pour la recherche.

## État et limites

Version de prévisualisation, non déployée depuis ce nouveau dépôt. REC ouvre le studio : il n’enregistre pas les radios. L’export vidéo se fait en temps réel, onglet visible ; MP4 ou WebM selon le navigateur. Les flux radio peuvent changer ou être limités géographiquement. Le stockage est propre au navigateur et à l’origine du site, sans synchronisation automatique entre domaines.

Voir [RADIOCASSETTE-PREVIEW.md](RADIOCASSETTE-PREVIEW.md) pour les vérifications et limites de l’intégration, [VERIFICATION-V1.md](VERIFICATION-V1.md) pour le studio et [STUDIO-HISTORY.md](STUDIO-HISTORY.md) pour son historique fonctionnel.

## Origine

- Moteur cassette et studio : [Virtual-Cassette-Player](https://github.com/SnakeBonD/Virtual-Cassette-Player), historique Git conservé jusqu’au commit `16e1f3b`.
- Façade et commandes radio adaptées de [retro-radio](https://github.com/SnakeBonD/retro-radio).
- Ce dépôt est indépendant : aucune modification de ces deux dépôts ni de leurs déploiements n’est nécessaire.

Voir [THIRD-PARTY-LICENSES.txt](THIRD-PARTY-LICENSES.txt) pour les dépendances. Aucune nouvelle licence globale n’est ajoutée.
