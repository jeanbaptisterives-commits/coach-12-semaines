#!/bin/sh
# Copie les vidéos rendues par le projet Remotion dans l'app et régénère src/data/animations.ts.
set -e
cd "$(dirname "$0")/.."
SRC="$HOME/Work/coach-12-animations/out/videos"
mkdir -p public/animations
ids=""
for f in "$SRC"/*.mp4; do
  id=$(basename "$f" .mp4 | tr '-' '_')
  cp "$f" "public/animations/$id.mp4"
  ids="$ids  '$id',\n"
done
printf "// Exercices qui ont une animation Remotion (public/animations/<id>.mp4).\n// Fichier régénéré par scripts/copier-animations.sh : ne pas éditer à la main.\nexport const ANIMATIONS = new Set<string>([\n$ids])\n" > src/data/animations.ts
echo "$(ls public/animations | wc -l | tr -d ' ') animations copiées"
