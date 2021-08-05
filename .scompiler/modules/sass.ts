import { Config } from "../server";
import { Filesystem, makeDir } from "../fs";
import chokidar from "chokidar";
import path from "path";
import globParent from "glob-parent";
import sass from "sass";
import { GlobSync } from "glob";
import { File } from "../types";
import { from, map, reduce, lastValueFrom, catchError, of } from "rxjs";
import isPathInside from "is-path-inside";
import fs from "fs";

export class SassModule {
    constructor(
        private config: Config,
        private fs: Filesystem,
        private onSendAll: (message: object) => void = () => {},
    ) { }

    async process(watch = false) {
        await Promise.all(this.config.sass.map(x => this.processEntry(x, watch)));
    }

    private async processEntry(entry: Config['sass'][0], watch: boolean) {
        if (!watch) {
            const entryPaths = new GlobSync(entry.src);

            await Promise.all(entryPaths.found.map(entryPath => this.render(entry, entryPath)));

            return;
        }

        const entryWatcher = chokidar.watch(entry.src);
        const depsWatcher = chokidar.watch([], {ignoreInitial: true});
        const registry: {[depPath: string]: string[]} = {};

        const setEntryDeps = (entryPath: string, deps: string[]): void => {
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

        const onEntryChange = (entryPath): void => {
            this.render(entry, entryPath).then(deps => setEntryDeps(entryPath, deps));
        }

        const onDepChange = (depPath): void => {
            const entryPaths = registry[depPath] || [];

            entryPaths.forEach(onEntryChange);
        }

        entryWatcher.on('add', onEntryChange);
        entryWatcher.on('change', onEntryChange);
        entryWatcher.on('unlink', (entryPath) => setEntryDeps(entryPath, []));

        depsWatcher.on('add', onDepChange);
        depsWatcher.on('change', onDepChange);
        depsWatcher.on('unlink', onDepChange);
    }

    private async render(entry: Config['sass'][0], entryPath: string): Promise<string[]> {
        const compile = map<File, File>(x => {
            const result = sass.renderSync({file: entryPath, data: x.content.toString()});
            const deps = result.stats.includedFiles.filter(x => x !== path.resolve(entryPath));

            return {
                content: result.css,
                path: x.path,
                dependencies: deps,
            };
        });

        const startTime = new Date().getTime();

        const file: File = {
            content: fs.readFileSync(entryPath),
            path: entryPath,
            dependencies: [],
        };

        let source$ = from([file]);

        source$ = entry.middleware ? entry.middleware(source$, compile) : source$.pipe(compile);

        return lastValueFrom(source$.pipe(
            map(x => {
                const relativePath = path.join(
                    entry.dst,
                    path.relative(
                        globParent(entry.src),
                        path.resolve(x.path),
                    ).replace(/\.scss$/, '.css'),
                );

                const localPath = path.join(this.config.distDir, relativePath);
                const publicPath = '/' + relativePath.replace('\\', '/');

                if (!isPathInside(localPath, this.config.distDir)) {
                    throw new Error('The file path must be a child of the config.distDir.');
                }

                makeDir(this.fs, path.dirname(localPath));

                this.fs.writeFileSync(localPath, x.content);

                this.onSendAll({
                    command: 'replaceCss',
                    file: [publicPath],
                });

                const currentTime = new Date().getTime();
                const passedTime = currentTime - startTime;

                console.log(`Style ${publicPath} compiled in: ${passedTime.toFixed(3)}ms`);

                return x.dependencies;
            }),
            catchError(error => {
                if ('formatted' in error && typeof error.formatted === 'string') {
                    console.error(error.formatted);

                    if (typeof error.file === 'string' && error.file !== path.resolve(entryPath)) {
                        return [error.file];
                    }
                } else {
                    console.error(error);
                }

                return of<string[]>([]);
            }),
            reduce<string[], string[]>((acc, deps) => {
                return [...acc, ... deps.filter(x => !acc.includes(x))];
            }, []),
        ));
    }
}
