import { map, OperatorFunction } from "rxjs";
import { File } from "./types";
import path from "path";

type PathParts = {
    dirname: string;
    basename: string;
    extname: string;
};

export function renameFile(callback: (pathParts: PathParts) => PathParts|string): OperatorFunction<File, File> {
    return map<File, File>(x => {
        const parts = callback({
            dirname: path.dirname(x.path),
            basename: path.basename(x.path, path.extname(x.path)),
            extname: path.extname(x.path),
        });
        const newPath = typeof parts === 'string' ? parts : `${parts.dirname}/${parts.basename}${parts.extname}`;

        return {...x, path: newPath};
    });
}

export function renameFileBasename(callback: (basename: string) => string) {
    return renameFile(x => ({...x, basename: callback(x.basename)}));
}
