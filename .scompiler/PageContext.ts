import { createContext, ReactNode } from 'react';

export interface PageContextValue {
    id: number;
    pageUrl: string;
    resize: (src: string, w: number, h: number) => string;
    svg: (icon: string) => ReactNode;
    vars?: {[key: string]: any};
}

const PageContext = createContext<PageContextValue>({
    id: 0,
    pageUrl: '',
    resize: () => '',
    svg: () => ''
});

export default PageContext;
