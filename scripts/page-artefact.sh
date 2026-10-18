#!/bin/sh
# Construit la version artefact Claude : dist-artefact/ + page.html (contenu de page, sans <html>/<head>,
# l'outil Artifact ajoute lui-même le squelette) + la liste des fichiers à publier à côté.
set -e
cd "$(dirname "$0")/.."
npx vite build --mode artefact > /dev/null
JS=$(cd dist-artefact && ls assets/index-*.js)
CSS=$(cd dist-artefact && ls assets/index-*.css)
cat > dist-artefact/page.html <<HTML
<title>Coach 12 semaines</title>
<link rel="stylesheet" href="$CSS">
<div id="root"></div>
<script type="module" src="$JS"></script>
HTML
(cd dist-artefact && find . -type f ! -name index.html ! -name page.html | sed 's|^\./||' | sort) > dist-artefact/fichiers.txt
echo "page : dist-artefact/page.html ($(wc -l < dist-artefact/fichiers.txt | tr -d ' ') fichiers)"
