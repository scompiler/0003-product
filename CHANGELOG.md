## Version 0.8.2 — 2021-08-09

- fix: build pages with SVG icons


## Version 0.8.1 — 2021-08-09

- fix: add support for relative image URLs


## Version 0.8.0 — 2021-08-07

- feat: add the ability to post-process images


## Version 0.7.0 — 2021-08-06

- feat: add the ability to post-process HTML files
- feat: add a module to compile the SVG sprite
- feat: add the ability to preprocess SCSS files


## Version 0.6.0 — 2021-08-04

- feat: add a function to the page context that returns unique identifier within the current page


## Version 0.5.2 — 2021-08-02

- fix: include Comment component in package


## Version 0.5.1 — 2021-07-23

- build: include required NPM dependencies in the package
- build: remove unused dependencies


## Version 0.5.0 — 2021-07-18

- feat: rename and post-process styles via RxJS
- feat: add the ability to rename style files
- feat: add the ability to post-processing of style files


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
