import { build } from "../.scompiler/build";
import { createFsFromVolume, Volume } from 'memfs';
import * as fs from "fs";
import isPathInside from 'is-path-inside';
import config from "./config";
import { copyFsContent } from "../.scompiler/fs";

const disk = new Volume();
const memFs = createFsFromVolume(disk);

build({...config, distDir: '/'}, memFs).then(() => {
    if (!isPathInside(config.distDir, __dirname)) {
        throw new Error('Path outside current dir');
    }

    if (fs.existsSync(config.distDir)) {
        fs.rmdirSync(config.distDir, {recursive: true});
    }

    copyFsContent(
        {fs: memFs, rootDir: '/'},
        {fs: fs, rootDir: config.distDir},
    );
});
