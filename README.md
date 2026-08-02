# Vampire Ducks 🧄🦆

A fun endless 3D isometric survival game for kids!  
Play as a cute chibi **CatDog** mutant, collect garlic in a procedurally generated forest, and petrify the rubber **Vampire Ducks** before they get you!

## Play Now

**Once GitHub Pages is enabled** the game will be available at:  
👉 **https://dagaben.github.io/vampireducks/**

(You may need to enable GitHub Pages in the repository Settings → Pages → Source: GitHub Actions)

### Local Play (for development)

```bash
git clone https://github.com/dagaben/vampireducks.git
cd vampireducks
npm install
npm run dev
```
Then open the local URL shown in the terminal (usually http://localhost:5173).

## Controls

| Platform | Movement | Jump |
|----------|----------|------|
| Desktop  | Arrow keys | **J** |
| Mobile   | Virtual joystick (bottom-left) | Tap the **JUMP** button |

## How to Play

- Collect **garlic** by walking over it.
- When you have **10 or more garlic** and a duck touches you → the duck turns to **stone** for 10 seconds and you lose 10 garlic.
- If you have fewer than 10 garlic when a duck touches you → you lose **1 life**.
- Reach **100 garlic** → gain 1 life back (garlic stays at 100).
- You start with **5 lives**. At 0 lives → Game Over.
- **Day** = fewer ducks (good collecting time).  
  **Night** = more aggressive ducks.
- Difficulty slowly increases every 30 garlic collected.
- Survive as long as you can and beat your high score!

## Current Version: v0.1.0 (First Playable)

✅ Isometric camera  
✅ Desktop + Mobile controls  
✅ Player movement & jump  
✅ Procedural forest (trees, rocks, rivers, bridges, garlic)  
✅ Chasing rubber vampire ducks  
✅ Garlic collection & petrify system  
✅ Lives + life regain at 100  
✅ Day/Night cycle  
✅ Score & Game Over screen  

### Coming later
- Better CatDog & duck models / animations
- Flying & swimming ducks fully polished
- More forest details (flowers, mushrooms, mountains)
- Sound effects (forest ambiance, quacks, "meowbuf")
- Particle effects on petrify
- High-score saving

## Tech

- Three.js + Vite
- Pure web – works in any modern browser
- Designed for longer survival sessions

## Repository Structure

See the `src/` folder for modular game code (Player, Duck, World, etc.).

---

Made with ❤️ for kids who love silly adventures.
