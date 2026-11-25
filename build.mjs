import {build} from 'esbuild';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await build({entryPoints:['src/metadata.js'],outfile:'public/metadata.js',bundle:true,format:'esm',platform:'browser',minify:true,legalComments:'linked'});
await build({entryPoints:['src/offline-export.js'],outfile:'public/offline-export.js',bundle:true,format:'esm',platform:'browser',minify:true,legalComments:'linked'});
const logo=await readFile('public/assets/brand/snakebond-logo.png');
await writeFile('public/app-icon.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><image width="512" height="512" href="data:image/png;base64,${logo.toString('base64')}"/></svg>`);
const assets=[];const hash=createHash('sha256');
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=dir+'/'+entry.name;if(entry.isDirectory())await walk(path);else if(entry.name!=='sw.js'){assets.push('/'+path.slice(7));hash.update(await readFile(path));}}}
await walk('public');
const template=await readFile('service-worker.template.js','utf8');hash.update(template);
await writeFile('public/sw.js',template.replace('__REVISION__',hash.digest('hex').slice(0,16)).replace('__ASSETS__',JSON.stringify(assets.sort())));
