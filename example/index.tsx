import { createServer } from '../.scompiler/server';
import config from "./config";

createServer({...config, distDir: __dirname + '/dist'});
