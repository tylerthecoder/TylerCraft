#!/bin/bash

# Do everything needed to start web app
cd "$(dirname "$0")"

set -e
set -x

yarn
yarn build

export PORT=4000,
export VITE_API_URL="https://craft.tylertracy.com"

source ./secrets.sh

yarn server start
