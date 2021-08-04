import { Config } from "../server";
import { Filesystem, makeDir } from "../fs";
import PageContext, { PageContextValue } from "../PageContext";
import ReactDomServer from "react-dom/server";
import React, { ReactNode } from "react";
import path from "path";
import { GlobSync } from "glob";
import globParent from "glob-parent";
import { Base64 } from "js-base64";

export type RenderPageOptions = {
    pageId: number;
    pageUrl: string;
    resizeFn: (publicPath: string, w: number, h: number) => string;
    svgFn: (icon: string) => ReactNode;
};

export class PagesModule {
    constructor(
        private config: Config,
        private fs: Filesystem,
        private getPageContext: () => RenderPageOptions|null = () => null,
    ) { }

    async process(watch = false) {
        const glob = path.join(this.config.pagesDir, '**', '*.tsx');
        const entryPaths = new GlobSync(glob);

        entryPaths.found.forEach(entryPath => {
            const relativePath = path.join(this.config.distDir, path.relative(globParent(glob), path.resolve(entryPath.replace(/\.tsx$/, '.html'))));
            const html = this.render(path.resolve(entryPath), this.getPageContext(), true);

            if (!this.fs.existsSync(path.dirname(relativePath))) {
                makeDir(this.fs, path.dirname(relativePath));
            }

            this.fs.writeFileSync(relativePath, html);
        });
    }

    render(pagePath, options: RenderPageOptions, build = false): string {
        delete require.cache[pagePath];

        const Page = require(pagePath).default;
        const styles = [];
        const scripts = [];

        if (!build) {
            styles.push({dangerouslySetInnerHTML: {__html: 'img[src^="/.scompiler/error.jpg?id="] { object-fit: fill; }'}});
            scripts.push({src: '/.scompiler/watcher.js'});
        }

        const pageId = options.pageId;
        const uniqueIds: {[namespace: string]: number|undefined} = {};
        const context: PageContextValue = {
            id: pageId,
            pageUrl: options.pageUrl,
            resize: options.resizeFn,
            svg: options.svgFn,
            vars: this.config.vars,
            links: [],
            styles: styles,
            scripts: scripts,
            uniqueId: (namespace = '__default__') => {
                if (!uniqueIds[namespace]) {
                    uniqueIds[namespace] = 0;
                }

                return ++uniqueIds[namespace];
            },
        };

        let html = ReactDomServer.renderToStaticMarkup(
            <PageContext.Provider value={context}>
                <Page />
            </PageContext.Provider>
        );

        if (Page.doctype !== false) {
            html = `<!DOCTYPE html>${html}`;
        }

        html = html.replace(/&lt;!--PULSAR_COMMENT\[([A-Za-z0-9+/=]*)]--&gt;/g, (_, comment) => {
            return `<!-- ${Base64.decode(comment)} -->`;
        });

        // html = prettier.format(html, {
        //     parser: "html",
        //     tabWidth: 4,
        // });

        return html;
    }
}
