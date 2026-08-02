# Vampire Ducks

A web-based endless 3D isometric survival game where a cute chibi CatDog mutant collects garlic to petrify rubber vampire ducks in a procedurally generated forest.

## Play the Game

*(Link will be added once the first playable version is deployed)*

## Game Design (Locked)

- **Camera**: Isometric-style top-down
- **Controls**:
  - Desktop: Arrow keys + J (jump)
  - Mobile: Virtual joystick (bottom-left) + tap to jump
- **Player**: Cute chibi fused CatDog mutant
- **Core mechanic**: Collect garlic (walk-over). ≥10 garlic petrifies a duck (costs 10 garlic). <10 garlic costs 1 life.
- **Lives**: 5 starting. Hit 100 garlic → +1 life (garlic count stays). 0 lives = Game Over → restart.
- **Ducks**: Walk (funny waddle), swim slowly, short flights. Progressively aggressive every 30 garlic collected. Petrified form lasts ~10s then disappears.
- **Environment**: Endless procedural stylized-cartoon forest (trees impassable, rivers crossable, bridges, rocks, mountains, bushes, flowers, mushrooms, lakes). Day/Night cycle (night = more ducks).
- **No power-ups** in first version.
- **Audio**: Forest ambiance, approaching duck quacks, "meowbuf" on petrify.
- **Art**: Stylized cartoon, natural colors.
- **Goal**: Long survival sessions + high score.

## Tech Stack

- **Three.js** for 3D rendering
- **Vite** for development & build
- Pure web (no install needed for players)
- Deployable to GitHub Pages / Netlify / Vercel

## Project Structure

```
vampireducks/
├── public/                 # Static assets (models, textures, sounds later)
├── src/
│   ├── main.js             # Entry point
│   ├── style.css           # Global styles + HUD
│   ├── game/
│   │   ├── Game.js         # Main game loop & state
│   │   ├── Player.js       # CatDog controller
│   │   ├── Duck.js         # Vampire rubber duck AI
│   │   ├── World.js        # Procedural forest generation
│   │   ├── Garlic.js       # Collectibles
│   │   ├── Camera.js       # Isometric camera follow
│   │   ├── Input.js        # Keyboard + mobile controls
│   │   ├── UI.js           # HUD, lives, garlic count, game over
│   │   └── Audio.js        # Sound management
│   └── utils/
│       ├── constants.js
│       └── helpers.js
├── index.html
├── package.json
├── vite.config.js
├── .gitignore
└── README.md
```

## Development

```bash
npm install
npm run dev          # Local development server
npm run build        # Production build
npm run preview      # Preview production build
```

## Versioning & Deployment

- `main` branch = stable / production
- Feature branches for development
- Tags for releases (v0.1.0, v0.2.0, ...)
- GitHub Pages deployment for public playable link

## Credits

Created for kids – fun, cartoonish, endless garlic-fueled survival against rubber vampire ducks!
