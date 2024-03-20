#!/bin/bash

# Do everything needed to start web app
cd "$(dirname "$0")"

set -e
set -x

nvm use 20

echo $(which node)

yarn

yarn build

export PORT=4000,
export VITE_API_URL="https://craft.tylertracy.com"

source ./secrets.sh

yarn server start

