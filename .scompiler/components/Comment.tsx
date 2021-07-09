import React from 'react';
import { Base64 } from 'js-base64';

type Props = {
    value: string;
};

export default function({value}: Props) {
    return (
        <>
            {`<!--PULSAR_COMMENT[${Base64.encode(value)}]-->`}
        </>
    );
}
