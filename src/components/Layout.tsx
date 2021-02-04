import React, { PropsWithChildren, useContext } from 'react';
import PageContext from '../../.scompiler/PageContext';

type Props = PropsWithChildren<{}>;

export default function(props: Props) {
    const { children } = props;
    const context = useContext(PageContext);

    return (
        <html lang="en" data-scompiler-id={context.id}>
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
