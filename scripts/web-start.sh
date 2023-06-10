# Do everything needed to start web app

set -e
set -x

yarn
yarn engine build
yarn world build
yarn server build
yarn web build
yarn server start