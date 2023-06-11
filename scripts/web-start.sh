# Do everything needed to start web app

set -e
set -x

yarn
yarn build
yarn server start