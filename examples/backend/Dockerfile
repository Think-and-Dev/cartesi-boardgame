#syntax=docker.io/docker/dockerfile:1

FROM --platform=linux/riscv64 cartesi/node:20.16.0-jammy-slim AS build-stage

RUN <<EOF
set -e
apt-get update
apt-get install -y --no-install-recommends python3 libsqlite3-dev build-essential 
EOF

WORKDIR /opt/cartesi/dapp
COPY . .
# we need python3 libsqlite3-dev build-essential to recompile the sqlite3
RUN npm uninstall sqlite3 && npm install --build-from-source sqlite3
RUN npm ci

FROM --platform=linux/riscv64 cartesi/node:20.16.0-jammy-slim 

ARG MACHINE_EMULATOR_TOOLS_VERSION=0.14.1
ADD https://github.com/cartesi/machine-emulator-tools/releases/download/v${MACHINE_EMULATOR_TOOLS_VERSION}/machine-emulator-tools-v${MACHINE_EMULATOR_TOOLS_VERSION}.deb /
RUN dpkg -i /machine-emulator-tools-v${MACHINE_EMULATOR_TOOLS_VERSION}.deb \
    && rm /machine-emulator-tools-v${MACHINE_EMULATOR_TOOLS_VERSION}.deb
LABEL io.cartesi.rollups.sdk_version=0.6.0
LABEL io.cartesi.rollups.ram_size=300Mi

ARG DEBIAN_FRONTEND=noninteractive

RUN <<EOF
set -e
apt-get update
apt-get install -y --no-install-recommends \
  busybox-static=1:1.30.1-7ubuntu3
rm -rf /var/lib/apt/lists/* /var/log* /var/cache/*
useradd --create-home --user-group dapp
EOF

WORKDIR /opt/cartesi/dapp
COPY --from=build-stage /opt/cartesi/dapp .
RUN chown -R dapp:dapp /opt/cartesi/dapp
RUN chmod -R 761 /opt/cartesi/dapp
USER dapp

ENV ROLLUP_HTTP_SERVER_URL="http:127.0.0.1:5004"

ENTRYPOINT ["rollup-init"]

CMD ["yarn", "start"]