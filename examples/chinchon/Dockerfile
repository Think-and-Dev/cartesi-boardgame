# syntax=docker.io/docker/dockerfile:1
# Optional argument to use npm version of the library
ARG MAIN_PACKAGE_VERSION="local_main_package_version"

FROM ubuntu:22.04 AS middleware-builder

ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH \
    RUST_VERSION=1.81.0

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
 
RUN mv ./Cargo.lock.docker ./Cargo.lock && \
    mv ./.cargo/config.docker.toml ./.cargo/config.toml && \
    tail ./.cargo/config.toml && \
    cargo build 


FROM --platform=linux/riscv64 cartesi/node:20.16.0-jammy-slim AS build-local_main_package_version
ONBUILD COPY packages/main /opt/cartesi/dapp/packages/main
ONBUILD COPY pnpm-workspace.yaml /opt/cartesi/dapp/pnpm-workspace.yaml
ONBUILD COPY .npmrc /opt/cartesi/dapp/.npmrc
ONBUILD RUN echo "Starting from base image with local main package"

FROM --platform=linux/riscv64 cartesi/node:20.16.0-jammy-slim AS build-npm_main_package_version
ONBUILD RUN echo "Starting from base image WITHOUT local main package"

FROM build-${MAIN_PACKAGE_VERSION} AS build-stage

RUN <<EOF
    set -e
    apt-get update
    apt-get install -y --no-install-recommends python3 libsqlite3-dev build-essential \
    && rm -rf /var/lib/apt/lists/* /var/log* /var/cache/*
    npm install -g pnpm
EOF

WORKDIR /opt/cartesi/dapp
# get needed files
COPY package.json pnpm-lock.yaml ./
COPY examples/chinchon /opt/cartesi/dapp/examples/chinchon
COPY --from=middleware-builder /opt/cartesi/dapp/target/riscv64gc-unknown-linux-gnu/debug/cartesi-drand /opt/cartesi/dapp/examples/chinchon/
COPY --from=middleware-builder /opt/cartesi/dapp/drand.config.json /opt/cartesi/dapp/examples/chinchon/
ARG MAIN_PACKAGE_VERSION="local_main_package_version"

# This build process is needed here to use a local version of the library, normally it would be installed from npm
WORKDIR /opt/cartesi/dapp/packages/main
RUN <<EOF
    if [ "$MAIN_PACKAGE_VERSION" = "local_main_package_version" ]; then \
        echo "Building main package from workspace"
        pnpm install --ignore-scripts --frozen-lockfile --filter .
        pnpm prepublishOnly
        pnpm prepack
        pnpm store prune
    fi
EOF

WORKDIR /opt/cartesi/dapp/examples/chinchon

# If MAIN_PACKAGE_VERSION is npm_main_package_version, install from npm; if not, use the workspace
# build chinchon server
RUN <<EOF 
    if [ "$MAIN_PACKAGE_VERSION" = "npm_main_package_version" ]; then \
        echo "Installing from npm"
        rm -rf ./pnpm-lock.yaml ./node_modules
        pnpm config set store-dir /opt/cartesi/pnpm-store --global
        pnpm install \
        pnpm add sqlite3 @koa/cors typescript @think-and-dev/cartesi-boardgame --allow-build=sqlite3
        pnpm build-server
        else \
        echo "Installing from workspace"
        sed -i '/link-workspace-packages=true/d' /opt/cartesi/dapp/.npmrc
        echo "link-workspace-packages=true" >> /opt/cartesi/dapp/.npmrc
        pnpm add @think-and-dev/cartesi-boardgame --workspace; \
        pnpm install --frozen-lockfile --ignore-scripts; \
        pnpm rebuild sqlite3 # this is needed to use sqlite3 in the server
        pnpm build-server --filter .
        fi
    pnpm store prune
EOF


FROM --platform=linux/riscv64 cartesi/node:20.16.0-jammy-slim AS runtime-stage

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

