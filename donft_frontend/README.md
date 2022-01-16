# donft_frontend

## Project setup
```
yarn install
```

### Compiles and hot-reloads for development
```
yarn serve
```

### Compiles and minifies for production
```
yarn build
```

### Lints and fixes files
```
yarn lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

## docker

### build

    docker build --rm --no-cache -t donft_frontend:latest .

### run

    docker run --rm  -p 8080:80  --name donft_frontend donft_frontend:latest
