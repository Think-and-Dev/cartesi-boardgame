#!/bin/bash

cp .dockerignore ../../.dockerignore

cartesi clean

cd ../../

if [ "$1" = "" ]; then
    USE_NPM_LIBRARY_VERSION=false   
else
    USE_NPM_LIBRARY_VERSION=$1
fi

# build docker image
docker build -f ./examples/chinchon/Dockerfile --build-arg USE_NPM_LIBRARY_VERSION=$USE_NPM_LIBRARY_VERSION -t cartesi/chinchon . 

rm .dockerignore

cd examples/chinchon

# build cartesi image
cartesi build --from-image cartesi/chinchon