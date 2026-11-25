import {RADIO_PRESETS} from './public/radio-presets.js';

export function metadataTitle(bytes) {
  let text=new TextDecoder().decode(bytes);
  if(text.includes('\ufffd'))text=new TextDecoder('windows-1252').decode(bytes);
  return (text.match(/StreamTitle='(.*?)';/s)?.[1]||'').replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,250);
}

export async function readIcyTitle(body,interval) {
  if(!Number.isInteger(interval)||interval<1||interval>65536){await body?.cancel();return '';}
  const reader=body.getReader();
  let skip=interval,remaining=-1,parts=[],total=0;
  try{
    while(total<262144){
      const {value,done}=await reader.read();if(done)break;
      total+=value.length;if(total>262144)break;
      let offset=0;
      while(offset<value.length){
        if(skip){const n=Math.min(skip,value.length-offset);skip-=n;offset+=n;continue;}
        if(remaining===-1){remaining=value[offset++]*16;parts=[];if(!remaining){remaining=-1;skip=interval;}continue;}
        const n=Math.min(remaining,value.length-offset);parts.push(value.slice(offset,offset+n));remaining-=n;offset+=n;
        if(!remaining){const bytes=new Uint8Array(parts.reduce((sum,p)=>sum+p.length,0));let pos=0;for(const p of parts){bytes.set(p,pos);pos+=p.length;}const title=metadataTitle(bytes);if(title)return title;remaining=-1;skip=interval;}
      }
    }
    return '';
  }finally{await reader.cancel().catch(()=>{});}
}

export async function lookupRadioTitle(id,fetcher=fetch) {
  const station=RADIO_PRESETS.find(s=>s.stationuuid===id);
  if(!station)return {title:'',supported:false};
  // Fixed public stations only; this endpoint cannot fetch a caller-supplied URL.
  const response=await fetcher(station.url_resolved,{headers:{'Icy-MetaData':'1'},redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!response.ok||!response.body){await response.body?.cancel();return {title:'',supported:true};}
  return {title:await readIcyTitle(response.body,Number(response.headers.get('icy-metaint'))),supported:true};
}
