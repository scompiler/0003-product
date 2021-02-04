import { useContext } from 'react';
import PageContext from './PageContext';

export function useResize() {
    const context = useContext(PageContext);

    return context.resize;
}
