#!/bin/sh
set -eu

archive=$(mktemp)
trap 'rm -f "$archive"' EXIT
curl -fsSL --retry 3 https://github.com/Dynrothe/Run-Escape/releases/download/v0.20.0/game-0.20.0.zip -o "$archive"
echo '81fb11403fa9ff2765ba1805b6e7a4462cd31ff8e33d6c0ea5458cd9f61ba02e  '"$archive" | sha256sum -c -
mkdir -p public/run-escape
unzip -oq "$archive" -d public/run-escape
