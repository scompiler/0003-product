import React from "react";

export function ErrorPage({text}) {
    return (
        <html lang="en">
            <head>
                <meta charSet="UTF-8" />
                <title>Scompiler</title>
            </head>
            <body>
                {text}
                <script src="/.scompiler/watcher.js" />
            </body>
        </html>
    );
}
