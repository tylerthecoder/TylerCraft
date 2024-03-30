# Tylercraft

Welcome to Tylercraft, a version of minecraft written using webgl.

## Usage

### Installation

Run `yarn` to install node dependencies

Install global cargo packages:
```
cargo install cargo-watch wasm-bindgen-cli wasm-pack
```

Add wasm target to rust:
```
rustup target add wasm32-unknown-unknown
```

### Development

Turborepo is used to manage multiple workspaces

`yarn dev` starts the dev server for all packages

Worlds are saved to disk. The default directory is `./game-data`. Override by setting the `DATA_DIR` environment variable.

### Deploying

Run `./scripts/deploy` to deploy code on server via ssh

Deployed on my private server. Run `./scripts/web-start.sh` to install and deploy

## Project Structure

This is a yarn workspace monorepo

- apps
  - web-client
    - Front end and rendering code 
    - Depends on lib/engine
    - public: All the images and css
  - server 
    - Backend code 
    - Depends on lib/engine
  - terrain-app 
    - An app for viewing terrain in a 2D grid
    - Depends on lib/engine
- lib
  - engine
    - Logic for everything 
    - Depends on lib/{engine, world}
  - eslint
    - Shared linting config
  - world
    - Rust app
  - terrain-gen
    - Rust app

## Random Docs

### Flow of events

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


### Debug

Currently only works in chrome. Server doesn't work, have to run dev for web, engine, and world.



