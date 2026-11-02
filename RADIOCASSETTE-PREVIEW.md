# Aperçu Radiocassette

URL locale : http://127.0.0.1:4173/radiocassette.html (npm start).
Dépôt dédié : SnakeBonD/radio-cassette-studio, branche main. Aucun déploiement effectué.

## Fonctionnement
- Modes Radio et Cassette, un seul élément audio ; le changement de mode arrête la source précédente.
- Recherche de stations par nom, flux HTTPS, favoris locaux.
- Playlist locale, lecture des tags, cassettes Originale et Années 80, quatorze finitions et accent par piste.
- Bouton Studio / REC : transfert vers le studio existant, avec copie du brouillon précédent dans les projets enregistrés.
- REC ouvre le montage : il ne capture pas les flux radio.

## Vérification du 1 novembre 2026
- Lecture réelle de RFM 80s, recherche RFM (31 résultats HTTPS).
- Lecture LIORA, arrêt de la radio lors du passage en mode cassette et inversement.
- Restauration de trois pistes locales et de leur finition après rechargement.
- Transfert au studio : LIORA, finition turquoise, projet précédent sauvegardé.
- Inspection visuelle sur bureau et à 390 px : cassette dans le compartiment, commandes dégagées.
- 39 tests existants réussis ; syntaxe JS et compilation réussies.

## Limites de cet aperçu
- Import multiple, enchaînement automatique et persistance des favoris implémentés, mais pas encore vérifiés de bout en bout dans cette nouvelle interface.
- Disponibilité des flux dépendante des stations. Recherche par nom uniquement.
- Le stockage est propre à chaque origine : les données des deux domaines publics ne sont pas automatiquement fusionnées.
- Aucun nouvel export vidéo testé depuis ce parcours ; le transfert réutilise le studio existant.

## Provenance
Façade, masques et commandes visuelles adaptés du dépôt de l’utilisateur https://github.com/SnakeBonD/retro-radio (copie locale de référence dans outputs/retro-radio-source). Le dessin animé des cassettes réutilise le moteur de Virtual-Cassette-Player. Les images de façade sont externalisées depuis le CSS original.

## Ajustement mobile
Écran LCD réduit de 120 pixels source ; compartiment cassette agrandi à hauteur totale du poste constante. Canvas conservé au rapport 880:573 avec object-fit:contain. Cassette immobile également visible en mode radio sur mobile. Vérification visuelle à 331 px dans les deux modes ; commandes dégagées.

## Transfert dans le dépôt dédié — 2 novembre 2026
- Copie indépendante ; historique du studio conservé jusqu’à 16e1f3b.
- Compilation réussie et 39 tests réussis dans ce nouveau dossier.
- Sept stations proposées (RFM et les six stations demandées), avec réponse audio vérifiée pour les six ajouts le 1 novembre.
- Bannière partagée Radio / Cassette / Studio, positions vérifiées identiques sur bureau et mobile.
- Navigation de retour depuis le studio avec sauvegarde préalable ; retour direct au mode choisi et reprise du brouillon.
- Mise en page horizontale et verticale corrigée pour préserver les proportions de la cassette.
- Aucun fichier temporaire, dépendance installée, secret ou liaison Vercel inclus.
