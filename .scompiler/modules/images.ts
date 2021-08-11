import { Config } from "../server";
import { Filesystem, makeDir } from "../fs";
import path from "path";
import isPathInside from "is-path-inside";
import * as localFs from "fs";
import Jimp from "jimp";
import { File } from "../types";
import { from, lastValueFrom } from "rxjs";

export class ImagesModule {
    private registry: {
        originalPath: string;
        resizedPath: string;
        currentPath: string;
    }[] = [];

    private tasks: {[path: string]: {original: string, w: number, h: number}} = {};

    constructor(
        private config: Config,
        private fs: Filesystem,
        private onSendAll: (message: object) => void = () => {},
    ) { }

    async process(watch = false) {
        const promises = Object.keys(this.tasks).map((dstPath) => {
            const entry = this.tasks[dstPath];

            return this.processImage(entry.original, dstPath, entry.w, entry.h);
        });

        await Promise.all(promises);
    }

    makeResizeFn(build = false): (publicPath: string, w: number, h: number) => string {
        return (publicPath, w, h) => {
            publicPath = path.normalize(publicPath);

            const imagesRoot = path.normalize(this.config.images.dst);

            if (!isPathInside(publicPath, imagesRoot)) {
                return publicPath.replace(/\\/g, '/');
            }

            const resizedPublicPath = this.getResizedImagePath(publicPath, w, h);
            const placeholder = '/.scompiler/blank.jpg?id=' + Buffer.from(resizedPublicPath).toString('base64');
            const errorImage = '/.scompiler/error.jpg?id=' + Buffer.from(resizedPublicPath).toString('base64');

            const relativePath = path.relative(imagesRoot, publicPath);
            const srcPath = path.join(this.config.images.src, relativePath);
            const dstPath = path.join(this.config.distDir, resizedPublicPath);

            if (build) {
                this.tasks[dstPath] = {original: srcPath, w, h};

                return resizedPublicPath;
            }

            let record = this.registry.find(x => x.originalPath === publicPath && x.resizedPath === resizedPublicPath);

            if (!record) {
                record = {
                    originalPath: publicPath,
                    resizedPath: resizedPublicPath,
                    currentPath: placeholder,
                };

                this.registry.push(record);
            }

            if (!localFs.existsSync(srcPath)) {
                return errorImage;
            }

            if (this.fs.existsSync(dstPath)) {
                // TODO: invalidate cache
                return resizedPublicPath;
            }

            this.processImage(srcPath, dstPath, w, h, () => {
                // TODO: image maybe resized before browser connect to the
                setTimeout(() => {
                    this.onSendAll({
                        replaceImage: {
                            oldPath: placeholder,
                            newPath: resizedPublicPath,
                        },
                    });
                }, 3000);
            }).then();

            // TODO: start watch original file.

            return placeholder;
        };
    }

    async processImage(srcPath: string, dstPath: string, w: number, h: number, onComplete: () => void = () => {}) {
        const needResize = w !== -1 || h !== -1;
        let buffer: Buffer;

        if (needResize) {
            buffer = await this.resizeImage(srcPath, w, h);
        } else {
            buffer = await localFs.promises.readFile(srcPath);
        }

        const file: File = {
            path: dstPath,
            content: buffer,
            dependencies: [],
        };
        const middleware = this.config.images.middleware || (x => x);
        const result = await lastValueFrom(middleware(from([file])));

        makeDir(this.fs, path.dirname(dstPath));

        await this.fs.promises.writeFile(dstPath, result.content);

        onComplete();
    }

    async resizeImage(src, w, h) {
        const image = await Jimp.read(src);

        let fn;

        if (w === -1 || h === -1) {
            fn = image.resize(w === -1 ? Jimp.AUTO : w, h === -1 ? Jimp.AUTO : w);
        } else {
            fn = image.cover(w, h);
        }

        return await fn.getBufferAsync(image.getMIME());
    }

    getResizedImagePath(src, w, h) {
        const extname = path.extname(src);
        const filename = path.basename(src, extname);
        const dirname = path.dirname(src).replace(/\\/g, '/');
        const prefix = (w !== -1 || h !== -1) ? `-${w}x${h}` : '';

        return `${dirname}/${filename}${prefix}${extname}`;
    }
}
