const execFileSync = require('child_process').execFileSync;
const path = require('path');
const fs = require('fs');
const basePackageJson = require('./package.json');

if (fs.existsSync(path.join('package'))) {
    fs.rmdirSync(path.join('package'), {recursive: true});
}

execFileSync(path.join('node_modules', '.bin', 'tsc.cmd'), [], {
    cwd: `${__dirname}`
});

fs.copyFileSync(path.join('.scompiler', 'watcher.js'), path.join('package', '.scompiler', 'watcher.js'));

const packageJson = {
    name: basePackageJson.name,
    private: false,
    version: basePackageJson.version,
    description: basePackageJson.description,
    author: basePackageJson.author,
    license: basePackageJson.license,
};

fs.writeFileSync(path.join('package', 'package.json'), JSON.stringify(packageJson, null, 4));
