#!/bin/bash

cp .dockerignore ../../.dockerignore

cartesi clean

cd ../../

if [ "$1" = "" ]; then
    MAIN_PACKAGE_VERSION=npm_main_package_version  
elif [ "$1" = "--use-local-library-version" ]; then
    MAIN_PACKAGE_VERSION=local_main_package_version
fi

# build docker image
docker buildx build -f ./examples/chinchon/Dockerfile --build-arg MAIN_PACKAGE_VERSION="$MAIN_PACKAGE_VERSION" -t cartesi/chinchon . 

rm .dockerignore

cd examples/chinchon

# build cartesi image
cartesi build --from-image cartesi/chinchon