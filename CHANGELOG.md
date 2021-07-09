## Version 0.4.0 — 2021-07-09

- feat: add component for rendering HTML comments
- feat: add the ability to automatically include a list of all scripts and styles needed during development
- feat: add the ability to specify in the config the variables available when rendering pages
- fix: save pages relative to the destination directory specified in the config


## Version 0.3.2 — 2021-07-09

- fix: when trying to resize an external image, instead of throwing an exception, return the original image path
- fix: fix the error that occurs when trying to require a page using a relative path


## Version 0.3.1 — 2021-07-09

- fix: fix the error that occurs when compiling pages in sub-directories


## Version 0.3.0 — 2021-07-09

- feat: implement build script
- build: generate formatted package.json


## Version 0.2.0 — 2021-07-02

- feat: correctly handle errors when rendering pages
- feat: render index.html when requesting the root directory
- feat: print server URL after startup
- fix: Include compiled files in package instead of sources


## Version 0.1.1 — 2021-07-02

- fix: Include sources in package instead of compiled files


## Version 0.1.0 — 2021-07-01

- initial release
