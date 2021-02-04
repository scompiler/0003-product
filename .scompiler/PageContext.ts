import { createContext } from 'react';

export interface PageContextValue {
    id: number;
    resize: (src: string, w: number, h: number) => string;
}

const PageContext = createContext<PageContextValue>({
    id: 0,
    resize: () => '',
});

export default PageContext;
