import isPathInside from 'is-path-inside';
import process from 'process';
import express from 'express';
import http from 'http';
import ws from 'ws';
import Jimp from 'jimp';
import fs from 'fs';
import path from 'path';
import ReactDomServer from 'react-dom/server';
import chokidar from 'chokidar';
import Module from 'module';
import React, { ReactNode } from 'react';
import svgr from '@svgr/core';
import { transpile } from 'typescript';
import webpack from 'webpack';
import { ErrorPage } from './ErrorPage';
import { TSError } from 'ts-node';
import { CopyModule } from "./modules/copy";
import { ImagesModule } from "./modules/images";
import { SassModule } from "./modules/sass";
import { PagesModule } from "./modules/pages";
import { JsModule } from "./modules/js";

export interface Config {
    port: number;
    distDir: string;
    pagesDir: string;
    componentsDir: string;
    dataDir: string;
    sass: {
        src: string;
        dst: string;
    }[];
    copy: {
        src: string;
        dst: string;
        watch?: boolean;
    }[];
    images: {
        src: string;
        dst: string;
    };
    js?: {
        src: string;
        dst: string;
        config?: webpack.Configuration;
    }[];
    iconResolver?: (iconPath: string) => ReactNode;
    vars?: {
        [key: string]: any;
    },
}

function requireFromString(code, filename) {
    // @ts-ignore
    const paths = Module._nodeModulePaths(path.dirname(filename));
    const parent = require.main;

    const m = new Module(filename, require.main);
    m.filename = filename;
    m.paths = [].concat(paths);
    // @ts-ignore
    m._compile(code, filename);

    const exports = m.exports;

    parent && parent.children && parent.children.splice(parent.children.indexOf(m), 1);

    return exports;
}

export function svgToReactComponent(icon: string, iconPath: string): ReactNode {
    let code = svgr.sync(icon);

    code = transpile(code, JSON.parse(fs.readFileSync('tsconfig.json').toString()).compilerOptions);

    return requireFromString(code, iconPath).default();
}

export function createServer(config: Config) {
    const nextPageId = (() => {
        let id = 0;

        function next() {
            return ++id;
        }

        next.current = () => id;

        return next;
    })();
    const readyPages = [];

    if (!isPathInside(config.distDir, process.cwd())) {
        throw new Error('Dist directory should be inside current working directory.');
    }

    if (fs.existsSync(config.distDir)) {
        fs.rmdirSync(config.distDir, {recursive: true});
    }

    const app = express();
    const server = http.createServer(app);
    const wss = new ws.Server({server: server});

    const blankImage = (async () => await new Jimp(1, 1, '#e5e5e5').getBufferAsync(Jimp.MIME_JPEG))();
    const errorImage = (async () => await new Jimp(1, 1, '#ff0000').getBufferAsync(Jimp.MIME_JPEG))();

    const handlePageRequest = function(pageName, req, res) {
        const pagePath = path.resolve(path.join(config.pagesDir, pageName.replace(/\.html$/, '.tsx')));
        const pageId = nextPageId();
        let html;

        console.time(`Page ${req.url} generated in`);

        try {
            html = pagesModule.render(pagePath, {
                pageId: pageId,
                pageUrl: req.url,
                resizeFn: imagesModule.makeResizeFn(),
                svgFn: makeSvgFn(config.iconResolver || (() => null)),
            });
        } catch (error) {
            let errorText = 'Undefined error';

            if (['MODULE_NOT_FOUND', 'ENOENT'].includes(error.code)) {
                errorText = '404';
            } else if (error instanceof TSError) {
                errorText = 'Typescript error';
            }

            let html = '<!DOCTYPE html>' + ReactDomServer.renderToStaticMarkup(
                <ErrorPage text={errorText} />
            );

            res.send(html);

            console.dir(error);

            throw error;
        } finally {
            console.timeEnd(`Page ${req.url} generated in`);
        }

        res.send(html);
    }

    wss.on('connection', (ws) => {
        ws.on('message', (message) => {
            if (typeof message !== 'string') {
                return;
            }

            try {
                const data = JSON.parse(message);

                if (data.command === 'ready') {
                    readyPages.push(data.pageId);

                    // console.log(`Page ${data.pageId} is ready`);
                }
            } catch (error) {
                console.error(error);
            }
        });
    });

    app.use(
        express.static(config.distDir)
    );
    app.get('/', (req, res) => {
        handlePageRequest('index.html', req, res);
    })
    app.get('/.scompiler/watcher.js', (req, res) => {
        res.send(fs.readFileSync(path.join(__dirname, 'watcher.js')));
    });
    app.get('/.scompiler/blank.jpg', async (req, res) => {
        res.contentType(Jimp.MIME_JPEG);
        res.end(await blankImage, 'binary');
    });
    app.get('/.scompiler/error.jpg', async (req, res) => {
        res.contentType(Jimp.MIME_JPEG);
        res.end(await errorImage, 'binary');
    });
    app.get(/\.html$/, (req, res) => {
        handlePageRequest(req.path, req, res);
    });

    server.listen(config.port, () => {
        let address = server.address();

        if (typeof address !== 'string') {
            address = address.port.toString();
        }

        console.log(`Server started: http://localhost:${address}/`);
        console.log('');
    });

    /*
    // Functions
    */
    function sendAll(message: object) {
        wss.clients.forEach((client) => client.send(JSON.stringify(message)));
    }
    function reload() {
        sendAll({
            command: 'reload',
        });
    }

    /*
    // Components
    */
    function invalidateModule(moduleId: string, chain: string[] = []) {
        if (
            !isPathInside(moduleId, path.resolve(config.pagesDir)) &&
            !isPathInside(moduleId, path.resolve(config.componentsDir)) &&
            !isPathInside(moduleId, path.resolve(config.dataDir))
        ) {
            return;
        }

        if (chain.includes(moduleId)) {
            return;
        }

        Object.keys(require.cache).forEach(mid => {
            const module = require.cache[mid];

            if (!module || module.children.findIndex(x => x.id === moduleId) === -1) {
                return;
            }

            invalidateModule(mid, [moduleId]);
        });

        delete require.cache[moduleId];
    }

    [
        config.pagesDir,
        config.componentsDir,
        config.dataDir,
    ].forEach(entryPath => {
        const watcher = chokidar.watch(path.join(entryPath, '**', '*.{ts,tsx,json}'), {ignoreInitial: true});

        function onChange(filePath) {
            invalidateModule(path.resolve(filePath));

            reload();
        }

        watcher.on('add', onChange);
        watcher.on('change', onChange);
        watcher.on('unlink', onChange);
    });

    /*
    // Pages
    */
    const pagesModule = new PagesModule(config, fs);

    /*
    // SASS
    */
    const sassModule = new SassModule(config, fs, message => sendAll(message));

    sassModule.process(true).then();

    /*
    // Copy
    */
    const copyModule = new CopyModule(config, fs, () => reload());

    copyModule.process(true).then();

    /*
    // Images
    */
    const imagesModule = new ImagesModule(config, fs, message => sendAll(message));

    /*
    // Icons
    */
    function makeSvgFn(iconResolver: (icon: string) => ReactNode) {
        return (icon: string) => {
            const result = iconResolver(icon);

            if (result) {
                return result;
            }

            return `Icon ${icon} not found!`;
        };
    }

    /*
    // JavaScript
    */
    const jsModule = new JsModule(config, fs);

    jsModule.process().then();
}
