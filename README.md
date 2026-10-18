# Coach 12 semaines

Application perso de suivi sportif : kettlebell, course, circuit et mobilité, 3 séances de 30 min par semaine, adaptées à chaque fois à la séance précédente et à la forme du matin.

- PWA installable sur iPhone, plein écran, fonctionne hors ligne.
- Données 100 % sur le téléphone (IndexedDB). Aucun serveur, aucun compte. Export / import JSON dans Réglages.

## Lancer en local

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests du moteur, de la bibliothèque et du parcours complet
npm run build      # version de production dans dist/
```

## Organisation

| Dossier | Rôle |
|---|---|
| `src/engine/` | Toute la logique, en fonctions pures testées : double progression, score de forme, génération des séances, rotation, course-marche, planning, statistiques, victoires |
| `src/data/` | Les 109 exercices et leurs schémas SVG |
| `src/db/` | Base locale Dexie, fin de séance (progression appliquée), export / import |
| `src/screens/` | Les écrans |

Règles de sécurité vérifiées par les tests : aucun exercice marqué non sûr pour les épaules n'est jamais proposé automatiquement ; fractionné, sauts et haute intensité restent verrouillés tant que « feu vert médical » n'est pas coché.

## Mettre en ligne (GitHub Pages)

L'app est publiée sur la branche `gh-pages`. Après une modification :

```bash
npm run deploy     # tests, build, puis publication sur gh-pages
```

GitHub Pages sert la branche `gh-pages` en HTTPS. Le code est public, **les données ne le sont jamais** : elles restent sur le téléphone.

## Installer sur l'iPhone

1. Ouvrir l'adresse dans **Safari** (pas Chrome : seul Safari installe les apps web sur iPhone).
2. Bouton Partager, puis **Sur l'écran d'accueil**, puis Ajouter.
3. Lancer l'app depuis l'icône : plein écran, et elle marche ensuite sans réseau.
4. Exporter une sauvegarde de temps en temps (Réglages) et la ranger dans Fichiers ou iCloud. Si tu supprimes l'app de l'écran d'accueil, iOS efface ses données.
