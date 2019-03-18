# rust-server-tools
Rust Server tools, including: installer, auto-updater, etc.


## Prerequisites

Install necessary tools.

* Ubuntu/Debian 64-Bit

  `sudo apt-get install lib32gcc1`

* RedHat/CentOS

  `yum install glibc libstdc++`

* RedHat/CentOS 64-Bit

  `yum install glibc.i686 libstdc++.i686`


If the instructions here doesn't work, check the necessary dependencies [in here](https://developer.valvesoftware.com/wiki/SteamCMD#Manually)


## Install

```
git clone https://github.com/kirbo/rust-server-tools.git
cd rust-server-tools
yarn install
cp example-config.js config.js
nano config.js
yarn install-rust
```

## Start

```
yarn start
```
