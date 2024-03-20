#!/bin/bash

# Do everything needed to start web app
cd "$(dirname "$0")"

set -e
set -x

export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm

nvm use 20
echo $(which node)


yarn

yarn build

export PORT=4000,
export VITE_API_URL="https://craft.tylertracy.com"

source ./secrets.sh

yarn server start

