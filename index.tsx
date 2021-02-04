import express from 'express';
import http from 'http';
import fs from 'fs';
import process from 'process';
import ws from 'ws';
import path from 'path';
import chokidar from 'chokidar';
import sass from 'sass';
import rimraf from 'rimraf';
import { GlobSync } from 'glob';
import globParent from 'glob-parent';
import isPathInside from 'is-path-inside';
import PageContext, { PageContextValue } from './.scompiler/PageContext';
import Jimp from 'jimp';
import React from 'react';
import ReactDomServer from 'react-dom/server';

interface Config {
    distDir: string;
    pagesDir: string;
    componentsDir: string;
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
}



const config: Config = {
    distDir: 'dist',
    pagesDir: 'src/pages',
    componentsDir: 'src/components',
    sass: [
        {src: 'src/scss/style.scss', dst: 'css'},
    ],
    copy: [
        {src: 'src/js/**/*', dst: 'js', watch: true},
        {src: 'node_modules/jquery/dist/**/*', dst: 'vendor/jquery'},
    ],
    images: {
        src: 'src/images',
        dst: 'images',
    },
};

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

rimraf.sync(config.distDir);

const app = express();
const server = http.createServer(app);
const wss = new ws.Server({server: server});

const blankImage = (async () => await new Jimp(1, 1, '#e5e5e5').getBufferAsync(Jimp.MIME_JPEG))();
const errorImage = (async () => await new Jimp(1, 1, '#ff0000').getBufferAsync(Jimp.MIME_JPEG))();

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        if (typeof message !== 'string') {
            return;
        }

        try {
            const data = JSON.parse(message);

            if (data.command === 'ready') {
                readyPages.push(data.pageId);

                console.log(`Page ${data.pageId} is ready`);
            }
        } catch (error) {
            console.error(error);
        }
    });
});

app.use(
    express.static(config.distDir)
);
app.get('/.scompiler/watcher.js', (req, res) => {
    res.send(fs.readFileSync('.scompiler/watcher.js'));
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
    const pagePath = path.resolve(path.join(config.pagesDir, req.url.replace(/\.html$/, '.tsx')));

    delete require.cache[pagePath];

    // TODO: check if not exists return 404
    const Page = require(pagePath).default;
    const pageId = nextPageId();

    const context: PageContextValue = {
        id: pageId,
        resize: makeResizeFn(req.url, pageId),
    };

    const html = ReactDomServer.renderToStaticMarkup(
        <PageContext.Provider value={context}>
            <Page />
        </PageContext.Provider>
    );

    // TODO: here we should know about all images: context.usedImages

    res.send(`<!DOCTYPE html>${html}`);
});

server.listen(3006, () => {
    let address = server.address();

    if (typeof address !== 'string') {
        address = address.port.toString();
    }

    console.log(`Server started on port ${address} :)`);
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
function makeDir(dirPath) {
    if (fs.existsSync(dirPath)) {
        return;
    }

    fs.mkdirSync(dirPath, {recursive: true});
}

/*
// Components
*/
[
    config.pagesDir,
    config.componentsDir,
].forEach(entryPath => {
    const watcher = chokidar.watch(path.join(entryPath, '**', '*.tsx'), {ignoreInitial: true});

    function onChange(filePath) {
        const localPath = path.resolve(filePath);

        delete require.cache[localPath];

        reload();
    }

    watcher.on('add', onChange);
    watcher.on('change', onChange);
    watcher.on('unlink', onChange);
});

/*
// SASS
*/
config.sass.forEach(entry => {
    const entryWatcher = chokidar.watch(entry.src);
    const depsWatcher = chokidar.watch([], {ignoreInitial: true});
    const registry: {[depPath: string]: string[]} = {};

    function setEntryDeps(entryPath: string, deps: string[]): void {
        deps.forEach(depPath => {
            if (!registry[depPath]) {
                registry[depPath] = [entryPath];

                depsWatcher.add(depPath);
            } else if (!registry[depPath].includes(entryPath)) {
                registry[depPath].push(entryPath);
            }
        });

        Object.keys(registry).forEach(depPath => {
            if (deps.includes(depPath)) {
                return;
            }
            if (!registry[depPath]) {
                return;
            }

            registry[depPath] = registry[depPath].filter(x => x !== entryPath);

            if (registry[depPath].length === 0) {
                delete registry[depPath];

                depsWatcher.unwatch(depPath);
            }
        });
    }

    function render(entryPath) {
        try {
            const result = sass.renderSync({file: entryPath});

            const relativePath = path.join(
                entry.dst,
                path.relative(
                    globParent(entry.src),
                    path.resolve(entryPath),
                ).replace(/\.scss$/, '.css'),
            );
            const publicPath = '/' + relativePath.replace('\\', '/');
            const localPath = path.join(config.distDir, relativePath);

            makeDir(path.dirname(localPath));

            fs.writeFileSync(localPath, result.css);

            sendAll({
                command: 'replaceCss',
                file: [publicPath],
            });

            console.log('Rendered:', publicPath);

            return result.stats.includedFiles.filter(x => x !== path.resolve(entryPath));
        } catch (error) {
            if ('formatted' in error && typeof error.formatted === 'string') {
                console.error(error.formatted);

                if (typeof error.file === 'string' && error.file !== path.resolve(entryPath)) {
                    return [error.file];
                }
            } else {
                console.error(error);
            }

            return [];
        }
    }

    function onEntryChange(entryPath): void {
        const deps = render(entryPath);

        setEntryDeps(entryPath, deps);
    }

    entryWatcher.on('add', onEntryChange);
    entryWatcher.on('change', onEntryChange);
    entryWatcher.on('unlink', (entryPath) => setEntryDeps(entryPath, []));

    function onDepChange(depPath): void {
        const entryPaths = registry[depPath] || [];

        entryPaths.forEach(onEntryChange);
    }

    depsWatcher.on('add', onDepChange);
    depsWatcher.on('change', onDepChange);
    depsWatcher.on('unlink', onDepChange);
});

/*
// Copy
*/
config.copy.forEach(entry => {
    const entryPaths = new GlobSync(entry.src);

    function getLocalPath(srcPath) {
        const relativePath = path.relative(globParent(entry.src), srcPath);
        const localPath = path.join(config.distDir, entry.dst, relativePath);

        if (!isPathInside(localPath, process.cwd())) {
            throw new Error('The file path must be a child of the current working directory.');
        }

        return path.join(config.distDir, entry.dst, relativePath);
    }

    function copy(srcPath) {
        const localPath = getLocalPath(srcPath);

        if (fs.existsSync(srcPath) && fs.lstatSync(srcPath).isDirectory()) {
            makeDir(localPath);
        } else {
            makeDir(path.dirname(localPath));

            fs.copyFileSync(srcPath, localPath);
        }
    }

    entryPaths.found.forEach(entryPath => copy(entryPath));

    if (!entry.watch) {
        return;
    }

    const watcher = chokidar.watch(entry.src, {ignoreInitial: true});

    function onChange(entryPath: string) {
        copy(entryPath);

        reload();
    }
    function onUnlink(entryPath: string) {
        const localPath = getLocalPath(entryPath);

        if (fs.existsSync(localPath)) {
            rimraf.sync(localPath);
        }

        reload();
    }

    watcher.on('add', onChange);
    watcher.on('change', onChange);
    watcher.on('unlink', onUnlink);
});

/*
// Images
*/
const imagesRegistry: {
    originalPath: string;
    resizedPath: string;
    currentPath: string;
    pages: string[];
}[] = [];
const imagesCache: {[publicPath: string]: string[]} = {};
function getFileName(src, w, h) {
    const extname = path.extname(src);
    const filename = path.basename(src, extname);
    const dirname = path.dirname(src).replace('\\', '/');
    const prefix = (w !== 0 || h !== 0) ? `-${w}x${h}` : '';

    return `${dirname}/${filename}${prefix}${extname}`;
}
async function resize(src, w, h) {
    const image = await Jimp.read(src);

    let fn;

    if (w === -1 || h === -1) {
        fn = image.resize(w === -1 ? Jimp.AUTO : w, h === -1 ? Jimp.AUTO : w);
    } else {
        fn = image.cover(w, h);
    }

    return await fn.getBufferAsync(image.getMIME());
}
function makeResizeFn(pagePath: string, pageId: number) {
    return (publicPath, w, h) => {
        publicPath = path.normalize(publicPath);

        const imagesRoot = path.normalize(`/${config.images.dst}`);

        if (!isPathInside(publicPath, imagesRoot)) {
            throw new Error('Wrong path');
        }

        const resizedPublicPath = getFileName(publicPath, w, h);
        const placeholder = '/.scompiler/blank.jpg?id=' + Buffer.from(resizedPublicPath).toString('base64');
        const errorImage = '/.scompiler/error.jpg?id=' + Buffer.from(resizedPublicPath).toString('base64');
        const needResize = w !== -1 || h !== -1;

        const relativePath = path.relative(imagesRoot, publicPath);
        const srcPath = path.join(config.images.src, relativePath);
        const dstPath = path.join(config.distDir, resizedPublicPath);

        let record = imagesRegistry.find(x => x.originalPath === publicPath && x.resizedPath === resizedPublicPath);

        if (!record) {
            record = {
                originalPath: publicPath,
                resizedPath: resizedPublicPath,
                currentPath: placeholder,
                pages: [pagePath],
            };

            imagesRegistry.push(record);
        } else {

        }

        if (!fs.existsSync(srcPath)) {
            return errorImage;
        }

        if (fs.existsSync(dstPath)) {
            // TODO: invalidate cache
            return resizedPublicPath;
        }

        if (needResize) {
            resize(srcPath, w, h).then(buffer => {
                makeDir(path.dirname(dstPath));

                fs.writeFile(dstPath, buffer, (err) => {
                    if (err) {
                        throw err;
                    }

                    // nextPageId.current();

                    // TODO: image maybe resized before browser connect to the
                    setTimeout(() => {
                        sendAll({
                            replaceImage: {
                                oldPath: placeholder,
                                newPath: resizedPublicPath,
                            },
                        });
                    }, 3000);
                });
            });
        } else {
            fs.copyFile(srcPath, dstPath, (err) => {
                if (err) {
                    throw err;
                }

                sendAll({
                    replaceImage: {
                        oldPath: placeholder,
                        newPath: resizedPublicPath,
                    },
                });
            });
        }

        // TODO: start watch original file.

        return placeholder;
    };
}
