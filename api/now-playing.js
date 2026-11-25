import {lookupRadioTitle} from '../radio-metadata.mjs';

export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET'){res.statusCode=405;res.end(JSON.stringify({title:''}));return;}
  const id=new URL(req.url,'http://localhost').searchParams.get('station');
  if(!id||id.length>100){res.statusCode=400;res.end(JSON.stringify({title:''}));return;}
  try{const result=await lookupRadioTitle(id);res.setHeader('Cache-Control','public, s-maxage=20, stale-while-revalidate=10');res.end(JSON.stringify(result));}
  catch{res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({title:'',unavailable:true}));}
}
