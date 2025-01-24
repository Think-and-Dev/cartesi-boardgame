#!/bin/bash

cd ../../

# build docker image
docker build -f ./examples/chinchon/Dockerfile .

# build cartesi image
cartesi build --from-image cartesi/chinchon