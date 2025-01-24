FROM --platform=linux/riscv64 cartesi/node:20.16.0-jammy-slim AS build-stage

RUN <<EOF
set -e
apt-get update
apt-get install -y --no-install-recommends python3 libsqlite3-dev build-essential 
EOF

WORKDIR /opt/cartesi/dapp
# get needed files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/main ./packages/main
COPY packages/drand-middleware ./packages/drand-middleware
COPY examples/chinchon ./examples/chinchon

# install dependencies
RUN npm install -g pnpm
RUN pnpm remove sqlite3 && pnpm install --build-from-source sqlite3
RUN pnpm install --frozen-lockfile

# build main library
WORKDIR /opt/cartesi/dapp/packages/main
RUN pnpm build

# build drand middleware
WORKDIR /opt/cartesi/dapp/packages/drand-middleware
RUN pnpm build

# build chinchon server
WORKDIR /opt/cartesi/dapp/examples/chinchon
RUN pnpm build-server

WORKDIR /opt/cartesi/dapp
RUN cp ./packages/drand-middleware/target/release/drand-middleware ./examples/chinchon/
RUN cp ./packages/drand-middleware/drand.config.json ./examples/chinchon/

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
apt-get install -y --no-install-recommends busybox-static=1:1.30.1-7ubuntu3
rm -rf /var/lib/apt/lists/* /var/log* /var/cache/*
useradd --create-home --user-group dapp
EOF

WORKDIR /opt/cartesi/dapp
COPY --from=build-stage /opt/cartesi/dapp .
RUN chown -R dapp:dapp /opt/cartesi/dapp
RUN chmod -R 761 /opt/cartesi/dapp
USER dapp

WORKDIR /opt/cartesi/dapp/examples/chinchon

ENV ROLLUP_HTTP_SERVER_URL="http://127.0.0.1:3000"

ENTRYPOINT ["rollup-init"]

CMD ["pnpm", "start-with-middleware"]

