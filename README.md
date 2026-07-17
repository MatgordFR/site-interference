<div align="center">

# 🫧 Interférence

### Une matière de verre iridescent, calculée en temps réel — pièce WebGL, **rendue image par image dans le navigateur.**

![WebGL](https://img.shields.io/badge/WebGL-990000?style=flat-square&logo=webgl&logoColor=white)
![three.js](https://img.shields.io/badge/three.js-vendoris%C3%A9%2C_0_CDN-000000?style=flat-square&logo=three.js&logoColor=white)
![GLSL](https://img.shields.io/badge/shaders-GLSL_fait_main-5b21b6?style=flat-square)
![CSP stricte](https://img.shields.io/badge/CSP-stricte-16a34a?style=flat-square)
![Licence](https://img.shields.io/badge/licence-ISC-2f81f7?style=flat-square)

[![▶ Ouvrir la démo](https://img.shields.io/badge/%E2%96%B6_Ouvrir_la_d%C3%A9mo-6d28d9?style=for-the-badge)](https://matgordfr.github.io/site-interference/)

<br>

[![Aperçu d'Interférence](preview.jpg)](https://matgordfr.github.io/site-interference/)

</div>

## Le principe

La couleur n'est pas peinte. C'est un **film mince** — une fine couche de verre dont l'épaisseur
varie de 130 à 640 nanomètres — et sa teinte **naît de l'angle** où se trouve l'œil, comme une
bulle de savon ou une nappe d'essence. Rien n'est une texture : tout est du calcul optique, à chaque image.

- **Verre physique** — `MeshPhysicalMaterial` : transmission, réfraction (IOR 1.47), iridescence, clearcoat.
- **Forme vivante** — une icosphère déformée par du **bruit simplex** dans le vertex shader ; la normale
  est recalculée après déformation, sinon la lumière ment.
- **Le scroll ne défile pas — il transforme la matière** : l'amplitude du bruit monte, le film s'amincit,
  le verre passe de calme à tourmenté.
- **La souris fait tourner** le volume. La couleur suit le regard.
- **Les reflets sont procéduraux** (`RoomEnvironment` + PMREM) — **aucune image d'environnement chargée.**

## Sous le capot

- **three.js `r185`, vendorisé** (`assets/vendor/`) — self-hébergé, **zéro CDN**, tout passe la CSP `'self'`.
- **Un shader GLSL fait main** (bruit simplex 3D, domaine public) greffé via `onBeforeCompile`.
- **CSP stricte** + `prefers-reduced-motion` (le mouvement se coupe, la matière reste).
- `IcosahedronGeometry(1.25, 128)`, DPR clampé à 1.75, tone mapping ACES.
- **0 dépendance runtime hors three.js**, 0 build, 0 framework.

> Démo — projet vitrine. Le code est libre (ISC). three.js est sous licence MIT (voir `assets/vendor/`).
