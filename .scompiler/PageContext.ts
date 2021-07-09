import React, { createContext, ReactNode } from 'react';

export interface PageContextValue {
    id: number;
    pageUrl: string;
    resize: (src: string, w: number, h: number) => string;
    svg: (icon: string) => ReactNode;
    vars?: {[key: string]: any};
    links: React.DetailedHTMLProps<React.LinkHTMLAttributes<HTMLLinkElement>, HTMLLinkElement>[];
    styles: React.DetailedHTMLProps<React.StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>[];
    scripts: React.DetailedHTMLProps<React.ScriptHTMLAttributes<HTMLScriptElement>, HTMLScriptElement>[];
}

const PageContext = createContext<PageContextValue>({
    id: 0,
    pageUrl: '',
    resize: () => '',
    svg: () => '',
    links: [],
    styles: [],
    scripts: [],
});

export default PageContext;
