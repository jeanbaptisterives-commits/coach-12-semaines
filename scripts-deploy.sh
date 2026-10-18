#!/bin/sh
# Tests, build, puis publication du dossier dist/ sur la branche gh-pages.
set -e
npm test
npm run build
cd dist
touch .nojekyll
git init -q -b gh-pages
git add -A
git commit -q -m "Publication $(date '+%Y-%m-%d %H:%M')"
git push -q -f "$(cd .. && git remote get-url origin)" gh-pages
echo "Publié."
