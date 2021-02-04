function reloadOnReconnect() {
    console.info('The connection was broken. An attempt to restore the connection after 1s.');

    setTimeout(() => {
        const socket = new WebSocket('ws://' + location.host);

        socket.addEventListener('open', location.reload.bind(location));
        socket.addEventListener('close', reloadOnReconnect);
    }, 1000);
}

function connect() {
    const socket = new WebSocket('ws://' + location.host);
    const pathMap = {};

    socket.addEventListener('open', function() {
        const html = document.querySelector('html[data-scompiler-id]');

        if (html) {
            socket.send(JSON.stringify({
                command: 'ready',
                pageId: parseFloat(html.dataset.scompilerId),
            }));
        }
    });

    socket.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);

            if (data.command === 'reload') {
                location.reload();
            }

            if (data.replaceImage) {
                const elements = [].slice.call(document.querySelectorAll('img[src="' + data.replaceImage.oldPath + '"]'));

                elements.forEach(x => {
                    x.setAttribute('src', data.replaceImage.newPath);
                });
            }

            if (data.command === 'replaceCss') {
                const a = document.createElement('a');

                a.href = data.file;

                const url = a.href;

                [].slice.call(document.querySelectorAll('link[rel="stylesheet"]')).forEach((link) => {
                    if (pathMap[link.href] === url || link.href === url) {

                        link.href = `${data.file}?scompiler-0003=${new Date().getTime()}`;

                        pathMap[link.href] = url;
                    }
                });
            }
        } catch (error) {
            console.error(error);
        }
    }

    socket.addEventListener('close', reloadOnReconnect);
}

connect();
