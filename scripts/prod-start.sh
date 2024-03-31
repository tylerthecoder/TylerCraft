#!/bin/bash

# Do everything needed to start web app
cd "$(dirname "$0")"

set -e

export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm

nvm install 20
nvm use 20

set -x

echo $(which node)

yarn

export VITE_API_URL="https://craft.tylertracy.com"

export PATH="$PATH:/root/.cargo/bin:"

yarn build

export PORT=4000
export DATA_DIR="/opt/tylercraft"

source ./secrets.sh

yarn server start

