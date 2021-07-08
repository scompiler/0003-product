import { Config } from "../server";
import { Filesystem } from "../fs";
import webpack from "webpack";
import path from "path";

export class JsModule {
    constructor(
        private config: Config,
        private fs: Filesystem,
    ) { }

    async process(watch = false) {
        const promises = (this.config.js || []).map(entry => {
            // TODO: Watch.
            // TODO: Lazy.
            // TODO: Auto-reload.

            const webpackConfig: webpack.Configuration = {
                entry: path.resolve(entry.src),
                output: {
                    path: path.dirname(path.join(this.config.distDir, entry.dst)).replace(/\\/g, '/'),
                    filename: path.basename(entry.dst),
                },
            };

            const compiler = webpack(webpackConfig);

            compiler.outputFileSystem = this.fs;

            return new Promise((resolve) => {
                compiler.run((err, stats) => {
                    if (err || stats.hasErrors()) {
                        // [Handle errors here](#error-handling)

                        if (err) {
                            console.error(err);

                            throw err;
                        } else {
                            console.error(stats.toString());

                            throw new Error(stats.toString());
                        }
                    }

                    resolve(void null);
                });
            })
        });

        await Promise.all(promises);
    }
}
