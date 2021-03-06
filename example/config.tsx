import { Config } from "../.scompiler/server";
import rtlcss from "rtlcss";
import { renameFileBasename } from "../.scompiler/rxjs";
import { from, map, merge, mergeMap, of } from "rxjs";
import prettier from "prettier";
import { stubImage } from "@scompiler/stub-image";

const config: Config = {
    port: 3006,
    distDir: __dirname + '/build',
    pagesDir: __dirname + '/src/pages',
    pageMiddleware: async html => {
        return prettier.format(html, {
            parser: "html",
            tabWidth: 4,
        });
    },
    componentsDir: __dirname + '/src/components',
    dataDir: __dirname + '/src/data',
    sass: [
        {src: __dirname + '/src/scss/style.scss', dst: 'css'},
        {
            src: __dirname + '/src/scss/style.scss',
            dst: 'css',
            middleware: (source$, compile) => source$.pipe(
                mergeMap(x => merge(
                    of(x).pipe(renameFileBasename(x => x + '.ltr')),
                    of(x).pipe(renameFileBasename(x => x + '.rtl')),
                )),
                compile,
                map(x => ({...x, content: Buffer.from(rtlcss.process(x.content.toString()))}))
            ),
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
        middleware: source$ => source$.pipe(
            mergeMap(x => from(stubImage(x.content, x.path)).pipe(map(y => ({...x, content: y})))),
        ),
    },
    js: [
        {src: __dirname + '/src/test.js', dst: 'test.js'},
    ],
    vars: {
        dir: 'ltr',
    },
    svg: [
        {src: __dirname + '/src/svg/**/*.svg', dst: 'sprite.svg', watch: true},
    ],
};

export default config;
