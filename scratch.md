# Move to pnp

## Project structure

- src
  - web - Front end and rendering code - Deps: game
    - assets - All the images and whatnot
    - shared - The shared rendering and game logic - Deps: game, assets
    - app - Starts the game and displays to screen. Contains build code - Deps: web/shared [moduleName]
    - workers
      - terrain
    - terrain-map-app - a separate app for viewing terrain - Deps: assets
  - server - Backend code - Deps: game
  - logic - Logic for everything - Deps: none
  - modules
    - [moduleName] - More game logic - Deps: web/shared, game
      - web
      - logic
