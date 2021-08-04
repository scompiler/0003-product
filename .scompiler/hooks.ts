import { useContext } from 'react';
import PageContext from './PageContext';

export function useResize() {
    const context = useContext(PageContext);

    return context.resize;
}

export function useResizeProps() {
    const context = useContext(PageContext);

    return (src: string, w: number, h: number) => {
        const url = context.resize(src, w, h);

        return {
            src: url,
            width: w,
            height: h,
        };
    };
}

export function useSvg() {
    const context = useContext(PageContext);

    return context.svg;
}

export function usePageUrl(): string {
    const context = useContext(PageContext);

    return context.pageUrl;
}

export function useVars() {
    const context = useContext(PageContext);

    return context.vars || {};
}

export function useLinks() {
    const context = useContext(PageContext);

    return context.links;
}

export function useStyles() {
    const context = useContext(PageContext);

    return context.styles;
}

export function useScripts() {
    const context = useContext(PageContext);

    return context.scripts;
}

export function useUniqueId(namespace?: string) {
    const context = useContext(PageContext);

    return context.uniqueId(namespace);
}
