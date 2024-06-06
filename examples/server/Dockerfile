#syntax=docker.io/docker/dockerfile:1

FROM node:20.8.0-bookworm as build-stage

WORKDIR /opt/cartesi/dapp
COPY . .
RUN npm i

FROM --platform=linux/riscv64 cartesi/node:20.8.0-jammy-slim

LABEL io.sunodo.sdk_version=0.6.0
LABEL io.cartesi.rollups.ram_size=300Mi

ARG MACHINE_EMULATOR_TOOLS_VERSION=0.14.1
ADD https://github.com/cartesi/machine-emulator-tools/releases/download/v${MACHINE_EMULATOR_TOOLS_VERSION}/machine-emulator-tools-v${MACHINE_EMULATOR_TOOLS_VERSION}.deb /
RUN dpkg -i /machine-emulator-tools-v${MACHINE_EMULATOR_TOOLS_VERSION}.deb \
    && rm /machine-emulator-tools-v${MACHINE_EMULATOR_TOOLS_VERSION}.deb

RUN <<EOF
set -e
apt-get update
apt-get get install -y --no-install-recommends \
busybox-static=1:1.30.1-7ubuntu3
rm -rf /var/lib/apt/lists/* /var/log* /var/cache/*
useradd --create-home --user-group dapp
EOF

ENV PATH="/opt/cartesi/bin:${PATH}"

WORKDIR /opt/cartesi/dappCOPY --from=build-stage /opt/cartesi/dapp/dist .

ENV ROLLUP_HTTP_SERVER_URL="http:127.0.0.1:5004"

ENTRYPOINT ["rollup-init"]
CMD {"yarn", "start"}