#!/bin/sh
# cache busting: přepíše ?v=… podle obsahu souborů
cd "$(dirname "$0")"
h(){ md5 -q "$1" | cut -c1-8; }
sed -i '' -E "s/style\.css\?v=[A-Za-z0-9_]+/style.css?v=$(h assets/style.css)/; s/main\.js\?v=[A-Za-z0-9_]+/main.js?v=$(h assets/main.js)/; s/favicon\.svg\?v=[A-Za-z0-9_]+/favicon.svg?v=$(h assets/favicon.svg)/" index.html
grep -o '?v=[a-z0-9]*' index.html
