const table=Uint32Array.from({length:256},(_,i)=>{for(let b=0;b<8;b++)i=i&1?0xedb88320^(i>>>1):i>>>1;return i>>>0;});
async function crc32(blob){let crc=0xffffffff,processed=0;const reader=blob.stream().getReader();try{while(true){const {value,done}=await reader.read();if(done)break;for(const byte of value)crc=table[(crc^byte)&255]^(crc>>>8);processed+=value.length;if(processed>=8388608){processed=0;await new Promise(resolve=>setTimeout(resolve,0));}}}finally{reader.releaseLock();}return (crc^0xffffffff)>>>0;}
function header(length,fields){const bytes=new Uint8Array(length),view=new DataView(bytes.buffer);for(const [offset,value,size=2]of fields)size===4?view.setUint32(offset,value,true):view.setUint16(offset,value,true);return bytes;}

// Store already-compressed video blobs directly; only the checksum is read in chunks.
export async function videoZip(files,onProgress=()=>{}){
 if(!files.length)throw Error('Aucune vidéo à regrouper.');
 if(files.length>65535)throw Error('Trop de vidéos pour une archive ZIP. Téléchargez-les séparément.');
 const parts=[],directory=[],used=new Set();let offset=0,directorySize=0;
 for(let i=0;i<files.length;i++){
  const {blob}=files[i];if(!(blob instanceof Blob))throw Error('Vidéo indisponible.');
  const raw=String(files[i].filename||'video.mp4').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/^[. ]+|[. ]+$/g,'')||'video.mp4';
  let name=raw,n=2;while(used.has(name.toLowerCase())){const dot=raw.lastIndexOf('.');name=dot>0?`${raw.slice(0,dot)} (${n++})${raw.slice(dot)}`:`${raw} (${n++})`;}
  used.add(name.toLowerCase());const encoded=new TextEncoder().encode(name);
  if(encoded.length>65535||offset+blob.size+30+encoded.length+directorySize+46+encoded.length+22>=0xffffffff)throw Error('Cette série dépasse la taille prise en charge par le ZIP (4 Go). Téléchargez les vidéos séparément.');
  onProgress(i,files.length);const crc=await crc32(blob);
  const local=header(30,[[0,0x04034b50,4],[4,20],[6,0x800],[12,33],[14,crc,4],[18,blob.size,4],[22,blob.size,4],[26,encoded.length]]);
  const central=header(46,[[0,0x02014b50,4],[4,20],[6,20],[8,0x800],[14,33],[16,crc,4],[20,blob.size,4],[24,blob.size,4],[28,encoded.length],[42,offset,4]]);
  parts.push(local,encoded,blob);directory.push(central,encoded);offset+=30+encoded.length+blob.size;directorySize+=46+encoded.length;
 }
 const end=header(22,[[0,0x06054b50,4],[8,files.length],[10,files.length],[12,directorySize,4],[16,offset,4]]);
 onProgress(files.length,files.length);return new Blob([...parts,...directory,end],{type:'application/zip'});
}
