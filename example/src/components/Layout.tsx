import React, { PropsWithChildren, useContext } from 'react';
import PageContext from '../../../.scompiler/PageContext';
import { useVars } from "../../../.scompiler/hooks";

type Props = PropsWithChildren<{}>;

export default function(props: Props) {
    const { children } = props;
    const context = useContext(PageContext);
    const vars = useVars();

    return (
        <html lang="en" dir={vars.dir || 'ltr'} data-scompiler-id={context.id}>
            <head>
                <meta charSet="UTF-8" />
                <title>Scompiler</title>
                <link rel="stylesheet" href="/css/style.css"/>
            </head>
            <body>
                {children}

                <script src="/.scompiler/watcher.js" />
            </body>
        </html>
    );
}
