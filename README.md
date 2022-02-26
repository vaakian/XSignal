# XSignal

clone the project

```shell
git clone --depth=1 https://github.com/vaakian/XSignal
```

install dependencies

```shell
cd XSignal
yarn install
```

run
```shell
node src/index.js
```


or you can use pm2 to run/stop/monitor it in the background.

```shell
pm2 start src/index.js --name signal-server
```