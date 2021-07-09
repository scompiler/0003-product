import React, { PropsWithChildren, useContext } from 'react';
import PageContext from '../../../.scompiler/PageContext';
import Comment from '../../../.scompiler/components/Comment';
import { useLinks, useScripts, useStyles, useVars } from "../../../.scompiler/hooks";

type Props = PropsWithChildren<{}>;

export default function(props: Props) {
    const { children } = props;
    const context = useContext(PageContext);
    const vars = useVars();
    const links = useLinks();
    const styles = useStyles();
    const scripts = useScripts();

    return (
        <html lang="en" dir={vars.dir || 'ltr'} data-scompiler-id={context.id}>
            <head>
                <meta charSet="UTF-8" />
                <title>Scompiler</title>
                <link rel="stylesheet" href="/css/style.css"/>

                {links.map((props, idx) => <link key={idx} {...props} />)}
                {styles.map((props, idx) => <style key={idx} {...props} />)}
            </head>
            <body>
                <Comment value="body" />{/* body */}
                {children}
                <Comment value="body / end" />

                {scripts.map((props, idx) => <script key={idx} {...props} />)}
            </body>
        </html>
    );
}
