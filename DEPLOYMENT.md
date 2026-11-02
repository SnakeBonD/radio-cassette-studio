# Déploiement du nouveau projet

Dépôt : https://github.com/SnakeBonD/radio-cassette-studio

Aucun déploiement ni domaine associé pour ce nouveau projet à cette étape. Ne pas réutiliser la liaison Vercel ni les domaines des projets d’origine sans instruction explicite.

Le fichier vercel.json conserve la configuration technique portable : commande `npm run build`, sortie `public`, fonctions `api/year.js` et `api/cover.js`. Les fichiers `.vercel` et `.env` ne font pas partie du dépôt.

Avant toute mise en ligne : choisir et vérifier un projet Vercel dédié, l’URL d’accueil (radio actuellement à `/radiocassette.html`, studio à `/`), le domaine éventuel et l’autorisation de déployer. Valider ensuite les imports, la lecture radio, les transitions de modes et un export vidéo avec audio sur l’URL cible.
