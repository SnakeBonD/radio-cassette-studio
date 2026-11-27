import {lookupCover,lookupCoverChoices} from '../cover-service.mjs';
export default async function handler(req,res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'GET') { res.setHeader('Allow','GET'); res.writeHead(405).end(JSON.stringify({reason:'method-not-allowed'})); return; }
  const query = new URL(req.url,'https://cassette.snakebond.net').searchParams;
  const artist = query.get('artist')?.trim(), title = query.get('title')?.trim(), album = query.get('album')?.trim() || '';
  if (!artist || !title || artist.length > 140 || title.length > 180 || album.length > 180) { res.writeHead(400).end(JSON.stringify({reason:'invalid-query'})); return; }
  const kind=query.get('kind')||'';
  const choices=query.get('mode')==='choices';
  if(kind&&!(choices?['All','Single','Album','Compilation']:['Single','Album']).includes(kind)){res.writeHead(400).end(JSON.stringify({reason:'invalid-query'}));return;}
  try { const result=choices?await lookupCoverChoices(artist,title,kind||'All'):await lookupCover(artist,title,kind?'':album,undefined,undefined,kind); res.writeHead(200).end(JSON.stringify(result)); }
  catch { res.writeHead(502).end(JSON.stringify({reason:'unavailable'})); }
}
