import { Config } from '../server';
import { GlobSync } from "glob";
import path from "path";
import globParent from "glob-parent";
import isPathInside from "is-path-inside";
import * as localFs from "fs";
import { Filesystem, makeDir } from "../fs";
import chokidar from 'chokidar';

export class CopyModule {
    constructor(
        private config: Config,
        private fs: Filesystem,
        private onReload: () => void = () => {},
    ) { }

    async process(watch = false) {
        this.config.copy.forEach(entry => {
            const entryPaths = new GlobSync(entry.src);

            const getLocalPath = (srcPath) => {
                const relativePath = path.relative(globParent(entry.src), srcPath);
                const localPath = path.join(this.config.distDir, entry.dst, relativePath);

                if (!isPathInside(localPath, this.config.distDir)) {
                    throw new Error('The file path must be a child of the current working directory.');
                }

                return path.join(this.config.distDir, entry.dst, relativePath);
            }

            const copy = (srcPath) => {
                const localPath = getLocalPath(srcPath);

                if (localFs.existsSync(srcPath) && localFs.lstatSync(srcPath).isDirectory()) {
                    makeDir(this.fs, localPath);
                } else {
                    makeDir(this.fs, path.dirname(localPath));

                    this.fs.writeFileSync(localPath, localFs.readFileSync(srcPath));
                }
            }

            entryPaths.found.forEach(entryPath => copy(entryPath));

            if (!watch || !entry.watch) {
                return;
            }

            const watcher = chokidar.watch(entry.src, {ignoreInitial: true});

            const onChange = (entryPath: string) => {
                copy(entryPath);

                this.onReload();
            }
            const onUnlink = (entryPath: string) => {
                const localPath = getLocalPath(entryPath);

                if (this.fs.existsSync(localPath)) {
                    this.fs.rmdirSync(localPath, {recursive: true});
                }

                this.onReload();
            }

            watcher.on('add', onChange);
            watcher.on('change', onChange);
            watcher.on('unlink', onUnlink);
        });
    }
}
