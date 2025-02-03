# syntax=docker.io/docker/dockerfile:1
FROM ubuntu:22.04 as middleware-builder

ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH \
    RUST_VERSION=1.78.0

ARG DEBIAN_FRONTEND=noninteractive
RUN <<EOF
    set -e
    apt update
    apt install -y --no-install-recommends \
        build-essential=12.9ubuntu3 \
        ca-certificates \
        g++-riscv64-linux-gnu=4:11.2.0--1ubuntu1 \
        wget=1.21.2-2ubuntu1 \
        && rm -rf /var/lib/apt/lists/* /var/log* /var/cache/*
    set -eux; \
    dpkgArch="$(dpkg --print-architecture)"; \
    case "${dpkgArch##*-}" in \
    amd64) rustArch='x86_64-unknown-linux-gnu'; rustupSha256='0b2f6c8f85a3d02fde2efc0ced4657869d73fccfce59defb4e8d29233116e6db' ;; \
    armhf) rustArch='armv7-unknown-linux-gnueabihf'; rustupSha256='f21c44b01678c645d8fbba1e55e4180a01ac5af2d38bcbd14aa665e0d96ed69a' ;; \
    arm64) rustArch='aarch64-unknown-linux-gnu'; rustupSha256='673e336c81c65e6b16dcdede33f4cc9ed0f08bde1dbe7a935f113605292dc800' ;; \
    i386) rustArch='i686-unknown-linux-gnu'; rustupSha256='e7b0f47557c1afcd86939b118cbcf7fb95a5d1d917bdd355157b63ca00fc4333' ;; \
    *) echo >&2 "unsupported architecture: ${dpkgArch}"; exit 1 ;; \
    esac; \
    url="https://static.rust-lang.org/rustup/archive/1.26.0/${rustArch}/rustup-init"; \
    wget "$url"; \
    echo "${rustupSha256} *rustup-init" | sha256sum -c -; \
    chmod +x rustup-init; \
    ./rustup-init -y --no-modify-path --profile minimal --default-toolchain $RUST_VERSION --default-host ${rustArch}; \
    rm rustup-init; \
    chmod -R a+w $RUSTUP_HOME $CARGO_HOME; \
    rustup --version; \
    cargo --version; \
    rustc --version;
EOF

RUN rustup target add riscv64gc-unknown-linux-gnu

WORKDIR /opt/cartesi/dapp

COPY packages/drand-middleware ./
 
RUN mv ./.cargo/config.docker.toml ./.cargo/config.toml && \
    tail ./.cargo/config.toml && \
    cargo build 


# ## This build process is needed here to use a local version of the library, normally it would be installed from npm
# FROM node:23-alpine as main-library-builder

# WORKDIR /opt/cartesi/dapp
# COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
# COPY packages/main ./packages/main

# RUN apk add g++ make py3-pip && npm install -g pnpm

# WORKDIR /opt/cartesi/dapp/packages/main
# RUN <<EOF
#     pnpm install --frozen-lockfile --filter .
#     pnpm prepublishOnly
#     pnpm prepack
#     pnpm export-bundle /opt/cartesi/output/
# EOF


FROM --platform=linux/riscv64 cartesi/node:20.16.0-jammy-slim AS build-stage

RUN <<EOF
    set -e
    apt-get update
    apt-get install -y --no-install-recommends python3 libsqlite3-dev build-essential \
    && rm -rf /var/lib/apt/lists/* /var/log* /var/cache/*
    npm install -g pnpm
EOF

WORKDIR /opt/cartesi/dapp
# get needed files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
# COPY --from=main-library-builder /opt/cartesi/output/ /opt/cartesi/dapp/packages/main
# TODO: remove this copy if we use the npm version of the library
COPY packages/main ./packages/main
COPY examples/chinchon /opt/cartesi/dapp/examples/chinchon
COPY --from=middleware-builder /opt/cartesi/dapp/target/riscv64gc-unknown-linux-gnu/debug/cartesi-drand /opt/cartesi/dapp/examples/chinchon/
COPY --from=middleware-builder /opt/cartesi/dapp/drand.config.json /opt/cartesi/dapp/examples/chinchon/

# Optional argument to use npm version of the library
ARG USE_NPM_LIBRARY_VERSION=false

# This build process is needed here to use a local version of the library, normally it would be installed from npm
WORKDIR /opt/cartesi/dapp/packages/main
RUN <<EOF
    if [ "$USE_NPM_LIBRARY_VERSION" = "false" ]; then \
        echo "Building main package from workspace"
        pnpm install --ignore-scripts --frozen-lockfile --filter .
        pnpm prepublishOnly
        pnpm prepack
        pnpm store prune
    fi
EOF

WORKDIR /opt/cartesi/dapp/examples/chinchon

# If USE_NPM_LIBRARY_VERSION is true, install from npm; if not, use the workspace
# build chinchon server
RUN <<EOF 
    if [ "$USE_NPM_LIBRARY_VERSION" = "true" ]; then \
        echo "Installing from npm"
        sed -i '/link-workspace-packages=false/d' /opt/cartesi/dapp/.npmrc
        echo "link-workspace-packages=false" >> /opt/cartesi/dapp/.npmrc
        pnpm add @think-and-dev/cartesi-boardgame; \
        pnpm install --frozen-lockfile --ignore-scripts --filter .; \
        else \
        echo "Installing from workspace"
        sed -i '/link-workspace-packages=true/d' /opt/cartesi/dapp/.npmrc
        echo "link-workspace-packages=true" >> /opt/cartesi/dapp/.npmrc
        pnpm add @think-and-dev/cartesi-boardgame --workspace; \
        pnpm install --frozen-lockfile --ignore-scripts; \
        fi
    pnpm rebuild sqlite3 # this is needed to use sqlite3 in the server
    pnpm build-server --filter .
    pnpm store prune
EOF


FROM --platform=linux/riscv64 cartesi/node:20.16.0-jammy-slim as runtime-stage

ARG MACHINE_EMULATOR_TOOLS_VERSION=0.14.1
ARG DEBIAN_FRONTEND=noninteractive

LABEL io.cartesi.rollups.sdk_version=0.9.0
LABEL io.cartesi.rollups.ram_size=1024Mi

RUN <<EOF
    set -e
    apt-get update \
        && apt-get install -y --no-install-recommends busybox-static=1:1.30.1-7ubuntu3 \
        ca-certificates wget netcat \
        && rm -rf /var/lib/apt/lists/* /var/log* /var/cache/* \
        && wget https://github.com/cartesi/machine-emulator-tools/releases/download/v${MACHINE_EMULATOR_TOOLS_VERSION}/machine-emulator-tools-v${MACHINE_EMULATOR_TOOLS_VERSION}.deb \
            && dpkg -i machine-emulator-tools-v${MACHINE_EMULATOR_TOOLS_VERSION}.deb \
            && rm machine-emulator-tools-v${MACHINE_EMULATOR_TOOLS_VERSION}.deb \
        && useradd --create-home --user-group dapp 
    npm install -g pnpm
EOF

WORKDIR /opt/cartesi/dapp

COPY --chown=dapp:dapp --chmod=761 --from=build-stage /opt/cartesi/dapp .

WORKDIR /opt/cartesi/dapp/examples/chinchon
USER dapp

ENTRYPOINT ["rollup-init"]

CMD ["./scripts/start-with-middleware.sh"]

