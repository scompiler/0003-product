import fs from 'fs';
import path from 'path';
import { IFs } from 'memfs';

export type Filesystem = typeof fs | IFs;

type A = {
    rootDir: string;
    fs: Filesystem;
};

export function copyFsContent(src: A, dst: A, current: string = '') {
    if (!dst.fs.existsSync(path.join(dst.rootDir, current))) {
        dst.fs.mkdirSync(path.join(dst.rootDir, current));
    }

    src.fs.readdirSync(path.join(src.rootDir, current)).forEach(entry => {
        if (['.', '..'].includes(entry)) {
            return;
        }

        const entryPath = path.join(src.rootDir, current, entry);

        if (src.fs.lstatSync(entryPath).isDirectory()) {
            copyFsContent(src, dst, path.join(current, entry));
        } else {
            dst.fs.writeFileSync(path.join(dst.rootDir, current, entry), src.fs.readFileSync(entryPath));
        }
    });
}

export function makeDir(fs: Filesystem, path) {
    if (fs.existsSync(path)) {
        return;
    }

    fs.mkdirSync(path, {recursive: true});
}
