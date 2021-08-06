import { Config } from '../server';
import { GlobSync } from "glob";
import path from "path";
import isPathInside from "is-path-inside";
import * as localFs from "fs";
import { Filesystem, makeDir } from "../fs";
import chokidar from 'chokidar';
import svgSprite from 'svg-sprite';

export class SvgModule {
    constructor(
        private config: Config,
        private fs: Filesystem,
        private onReload: () => void = () => {},
    ) { }

    async process(watch = false) {
        this.config.svg?.forEach(entry => {
            const compile = async () => {
                const localPath = path.join(this.config.distDir, entry.dst);
                const entryPaths = new GlobSync(entry.src);

                if (entryPaths.found.length === 0) {
                    if (this.fs.existsSync(localPath) && this.fs.lstatSync(localPath).isFile()) {
                        this.fs.unlinkSync(localPath);
                    }

                    return Promise.resolve();
                }

                const sprite = new svgSprite({
                    mode: {
                        symbol: true,
                    },
                });

                entryPaths.found.forEach(entryPath => {
                    sprite.add(entryPath, null, localFs.readFileSync(entryPath).toString());
                });

                return new Promise(resolve => {
                    sprite.compile((error: Error, result) => {
                        for (let mode in result) {
                            for (let resource in result[mode]) {
                                if (!isPathInside(localPath, this.config.distDir)) {
                                    throw new Error('The file path must be a child of the current working directory.');
                                }

                                makeDir(this.fs, path.dirname(localPath));

                                this.fs.writeFileSync(localPath, result[mode][resource].contents);
                            }
                        }

                        resolve(void null);
                    });
                });
            };

            compile().then();

            if (!watch || !entry.watch) {
                return;
            }

            const watcher = chokidar.watch(entry.src, {ignoreInitial: true});

            const onChange = () => {
                compile().then(() => this.onReload());
            }

            watcher.on('add', onChange);
            watcher.on('change', onChange);
            watcher.on('unlink', onChange);
        });
    }
}
