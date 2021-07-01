import React from 'react';
import { useResize } from '../../../.scompiler/hooks';

interface Props {
    src: string,
    width: number,
    height: number,
}

export default function(props: Props) {
    const { src, width, height } = props;
    const resize = useResize();

    return (
        <img src={resize(src, width, height)} alt="" width={width} height={height} />
    );
}
