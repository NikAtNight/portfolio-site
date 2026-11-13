#!/bin/bash
# PROTOTYPE. Regenerates the demo pages from the real index.html, so their content
# never drifts from the site. Not part of deploy.sh, never uploaded.
#   index.html    the page with the 2D game layer (XP, quests, console, raid battles)
#   world3d.html  the page as a small 3D game (three.js); ?mode=text falls back to the page
set -euo pipefail
cd "$(dirname "$0")"
ASSETS='s#(src|href)="(ghchart\.svg|logo\.svg|apple-touch-icon\.png|Nikhil_Kapadia_Resume\.pdf)"#$1="../../$2"#g;'
perl -pe "$ASSETS"'
  s#</head>#<link rel="stylesheet" href="game.css">\n</head>#;
  s#</body>#<script src="game.js"></script>\n<script src="raid-sprites.js"></script>\n<script src="raid.js"></script>\n</body>#;
' ../../index.html > index.html
# the inline script turns 3D on before anything paints, so the plain page never flashes
perl -pe "$ASSETS"'
  s#</head>#<link rel="stylesheet" href="game.css">\n<link rel="stylesheet" href="world3d.css">\n</head>#;
  s#<body>#<body>\n<script>if (!/[?&]mode=text/.test(location.search)) document.body.classList.add("w3d");</script>#;
  s#</body>#<script src="game.js"></script>\n<script src="vendor/three.bundle.js"></script>\n<script src="world3d-data.js"></script>\n<script src="world3d-build.js"></script>\n<script src="world3d-models.js"></script>\n<script src="world3d.js"></script>\n</body>#;
' ../../index.html > world3d.html
echo "wrote $(pwd)/index.html and world3d.html"
