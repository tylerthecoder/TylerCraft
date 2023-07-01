# Do everything needed to start web app
cd "$(dirname "$0")"

set -e
set -x

yarn
yarn build
yarn server start
