# Product invariants

## 3D dice

- The only 3D dice allowed in the product are the real Fantastic Dice WebGL dice. Never add CSS, DOM, canvas, image, or other imitation/fallback “3D dice”.
- Fantastic Dice must finish the complete roll animation. Do not hide, clear, replace, or interrupt the animation before every die has settled.
- The result produced by Fantastic Dice is the authoritative roll result.
- Every player must see the same Fantastic Dice roll and result, both on their own turns and on opponents’ turns.
- Settled Fantastic Dice remain visibly lying in the throw area until the next roll or turn clears them.
- The 3D throw area, the 2D selection row, and the 2D saved row are visible at the same time after a roll.
- Players interact with the 2D dice to save or release dice. Those controls must not replace or hide the settled Fantastic Dice.
