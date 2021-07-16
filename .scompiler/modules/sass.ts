import { Config } from "../server";
import { Filesystem, makeDir } from "../fs";
import chokidar from "chokidar";
import path from "path";
import globParent from "glob-parent";
import sass from "sass";
import { GlobSync } from "glob";

export class SassModule {
    constructor(
        private config: Config,
        private fs: Filesystem,
        private onSendAll: (message: object) => void = () => {},
    ) { }

    async process(watch = false) {
        this.config.sass.forEach(entry => {
            const render = (entryPath) => {
                const relativePath = path.join(
                    entry.dst,
                    path.relative(
                        globParent(entry.src),
                        path.resolve(entryPath),
                    ).replace(/\.scss$/, '.css'),
                );
                const localPath = path.join(this.config.distDir, relativePath);
                const publicPath = '/' + relativePath.replace('\\', '/');

                try {
                    console.time(`Style ${publicPath} compiled in`);

                    const result = sass.renderSync({file: entryPath});

                    makeDir(this.fs, path.dirname(localPath));

                    const dirname = path.dirname(localPath);
                    const basename = entry.rename ? entry.rename(path.basename(localPath)) : path.basename(localPath);

                    this.fs.writeFileSync(path.join(dirname, basename), entry.postProcess ? entry.postProcess(result.css) : result.css);

                    this.onSendAll({
                        command: 'replaceCss',
                        file: [publicPath],
                    });

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
                } finally {
                    console.timeEnd(`Style ${publicPath} compiled in`);
                }
            }

            if (!watch) {
                const entryPaths = new GlobSync(entry.src);

                entryPaths.found.forEach(entryPath => render(entryPath));

                return;
            }

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
    }
}
