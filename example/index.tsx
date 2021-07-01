import { Config, createServer } from '../.scompiler/server';

const config: Config = {
    port: 3006,
    distDir: __dirname + '/dist',
    pagesDir: __dirname + '/src/pages',
    componentsDir: __dirname + '/src/components',
    dataDir: __dirname + '/src/data',
    sass: [
        {src: __dirname + '/src/scss/style.scss', dst: 'css'},
    ],
    copy: [
        {src: __dirname + '/src/js/**/*', dst: 'js', watch: true},
        {src: 'node_modules/jquery/dist/**/*', dst: 'vendor/jquery'},
    ],
    images: {
        src: __dirname + '/src/images',
        dst: 'images',
    },
};

createServer(config);
