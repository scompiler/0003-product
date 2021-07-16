import { Config } from "../.scompiler/server";
import rtlcss from "rtlcss";

const config: Config = {
    port: 3006,
    distDir: __dirname + '/build',
    pagesDir: __dirname + '/src/pages',
    componentsDir: __dirname + '/src/components',
    dataDir: __dirname + '/src/data',
    sass: [
        // {src: __dirname + '/src/scss/style.scss', dst: 'css'},
        {
            src: __dirname + '/src/scss/style.scss',
            dst: 'css',
            postProcess: file => {
                return Buffer.from(rtlcss.process(file.toString()));
            },
        },
    ],
    copy: [
        {src: __dirname + '/src/js/**/*', dst: 'js', watch: true},
        {src: __dirname + '/src/external-images/**/*', dst: 'external-images', watch: true},
        {src: 'node_modules/jquery/dist/**/*', dst: 'vendor/jquery'},
    ],
    images: {
        src: __dirname + '/src/images',
        dst: 'images',
    },
    js: [
        {src: __dirname + '/src/test.js', dst: 'test.js'},
    ],
    vars: {
        dir: 'ltr',
    },
};

export default config;
