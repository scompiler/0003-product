import { Config } from "../server";
import { Filesystem, makeDir } from "../fs";
import PageContext, { PageContextValue } from "../PageContext";
import ReactDomServer from "react-dom/server";
import React, { ReactNode } from "react";
import path from "path";
import { GlobSync } from "glob";
import globParent from "glob-parent";

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
            const html = this.render(path.resolve(entryPath), this.getPageContext());

            if (!this.fs.existsSync(path.dirname(relativePath))) {
                makeDir(this.fs, path.dirname(relativePath));
            }

            this.fs.writeFileSync(relativePath, html);
        });
    }

    render(pagePath, options: RenderPageOptions): string {
        delete require.cache[pagePath];

        const Page = require(pagePath).default;

        const pageId = options.pageId;
        const context: PageContextValue = {
            id: pageId,
            pageUrl: options.pageUrl,
            resize: options.resizeFn,
            svg: options.svgFn,
        };

        let html = ReactDomServer.renderToStaticMarkup(
            <PageContext.Provider value={context}>
                <Page />
            </PageContext.Provider>
        );

        if (Page.doctype !== false) {
            html = `<!DOCTYPE html>${html}`;
        }

        // html = prettier.format(html, {
        //     parser: "html",
        //     tabWidth: 4,
        // });

        return html;
    }
}
