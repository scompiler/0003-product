import { Config } from './server';
import { CopyModule } from "./modules/copy";
import { ImagesModule } from "./modules/images";
import { SassModule } from "./modules/sass";
import { PagesModule } from "./modules/pages";
import { JsModule } from "./modules/js";
import { Filesystem } from "./fs";
import { SvgModule } from "./modules/svg";
import { ReactNode } from "react";

export async function build(config: Config, memFs: Filesystem) {
    function makeSvgFn(iconResolver: (icon: string) => ReactNode) {
        return (icon: string) => {
            const result = iconResolver(icon);

            if (result) {
                return result;
            }

            return `Icon ${icon} not found!`;
        };
    }

    const pagesModule = new PagesModule(config, memFs, () => ({
        pageId: 0,
        pageUrl: '',
        resizeFn: imagesModule.makeResizeFn(true),
        svgFn: makeSvgFn(config.iconResolver || (() => null)),
    }));
    const imagesModule = new ImagesModule(config, memFs);
    const copyModule = new CopyModule(config, memFs);
    const sassModule = new SassModule(config, memFs);
    const jsModule = new JsModule(config, memFs);
    const svgModule = new SvgModule(config, memFs);

    /*
    // Pages
    */
    await pagesModule.process();

    /*
    // Copy
    */
    await copyModule.process();

    /*
    // SASS
    */
    await sassModule.process();

    /*
    // Images
    */
    await imagesModule.process();

    /*
    // JavaScript
    */
    await jsModule.process();

    /*
    // SVG
    */
    await svgModule.process();
}
