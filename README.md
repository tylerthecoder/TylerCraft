# Tylercraft

This is Tylercraft, a version of minecraft written using webgl.

# Development

Dev commands `yarn server dev`, `yarn client dev`, `yarn world dev`

# Deploying

The server lives on my raspberry pi. The whole app can be deployed by running `make deploy-pi` when on the same network as the pi.

# Random Docs

## Flow of events

Client controller generates client events
Events are sent to Game on both the server and client
Game will handle the events and generate state diff (add new entity, add new block)
State diff on client will be applied
State diff on the server will be sent to other clients

Game will be running game loop 20 times a second
Game loop will ask all entities if they have state diffs (Adding actions, Moving blocks, etc)
Game will apply all state diffs and send to clients

Notice client generated actions should happen immediately while game generated events will happen every _tick_ of the game loop

Basic idea for moving to scripts
The Game class controls all game logic. Game will have a property that is a Program. The Game will ask the Program for ClientActions during the game loop.

EntityHandlers control entities by pushing MicroActions to them. Entities take these MicroActions and generate a diff.

WorldModels are pre game. They create the game by either asking the client storage or the server.

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




## Debug

Currently only works in chrome. Server doesn't work, have to run dev for web, engine, and world. I think it is because we get all blocks that aren't void in the chunk, then we update the mesh for them. Since we removed the block, it isn't returned in the array of all blocks, so we don't update at that location.

My idea to fix this is to add a dirty array to the chunk that is updated when a block is added or removed. Then when we update the mesh, we can check if the block is in the dirty array



