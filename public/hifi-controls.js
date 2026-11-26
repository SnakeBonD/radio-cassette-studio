// Hardware rendered in the same 941 × 1672 coordinates as the deck.
function box(g,x,y,w,h,r,fill){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();}
function gradient(g,y,h,stops){const fill=g.createLinearGradient(0,y,0,y+h);for(const [at,color] of stops)fill.addColorStop(at,color);return fill;}
export function drawHifiTop(g){
 g.save();
 g.fillStyle='#0b0c0d';g.fillRect(0,0,941,54);
 // Continuous folded aluminium lid, aligned with the front-panel edges.
 box(g,15,17,910,39,7,gradient(g,17,39,[[0,'#17191a'],[.12,'#383a3b'],[.24,'#27292a'],[.77,'#202223'],[.93,'#141617'],[1,'#080909']]));
 g.save();g.beginPath();g.roundRect(16,18,908,35,6);g.clip();
 for(let row=20;row<52;row++){
  g.fillStyle=row%3===0?'#ffffff09':'#00000012';
  g.fillRect(18,row,904,.5);
 }
 const reflection=g.createLinearGradient(15,0,925,0);
 reflection.addColorStop(0,'#ffffff00');reflection.addColorStop(.24,'#ffffff0d');reflection.addColorStop(.65,'#ffffff03');reflection.addColorStop(1,'#00000020');
 g.fillStyle=reflection;g.fillRect(15,17,910,39);g.restore();
 // Hairline machining and recessed seam, without a bright silver stripe.
 g.fillStyle='#777b7860';g.fillRect(23,21,894,.7);
 g.fillStyle='#070809';g.fillRect(18,54,904,2);
 g.fillStyle='#51544f60';g.fillRect(22,57,896,.7);

 g.restore();
}
let keySurface;
function createKeys(deck){
 const c=document.createElement('canvas');c.width=842;c.height=216;const g=c.getContext('2d');
 box(g,0,0,842,214,16,'#090a0b');
 box(g,3,3,836,208,13,'#4b4b47');box(g,5,5,832,204,11,'#060707');
 for(let i=0;i<5;i++){
  const x=13+i*164;
  box(g,x,14,158,189,10,'#000');
  box(g,x+3,8,152,185,9,gradient(g,8,185,[[0,'#62635f'],[.035,'#92958e'],[.09,'#333536'],[.86,'#17191a'],[.95,'#50534e'],[1,'#1c1e1f']]));
  g.save();g.beginPath();g.roundRect(x+8,23,142,151,5);g.clip();for(let row=23;row<174;row+=24)g.drawImage(deck,120+i*145,9,142,24,x+8,row,142,24);
  g.fillStyle=gradient(g,23,151,[[0,'#ffffff09'],[.48,'#00000025'],[1,'#00000070']]);g.fillRect(x+8,23,142,151);
  // Fine horizontal brushing stays fixed during export.
  for(let row=25;row<173;row+=3){g.fillStyle=row%2?'#ffffff06':'#00000016';g.fillRect(x+9,row,140,1);}
  g.restore();g.fillStyle='#b5b3a34d';g.fillRect(x+10,23,138,1);
 }
 return c;
}
function triangle(g,x,y,direction){g.beginPath();g.moveTo(x+direction*14,y);g.lineTo(x-direction*10,y-17);g.lineTo(x-direction*10,y+17);g.closePath();g.fill();}
function arrow(g,x,y,direction){g.beginPath();g.moveTo(x-direction*8,y-7);g.lineTo(x,y);g.lineTo(x-direction*8,y+7);g.stroke();}
export function drawHifiKeys(g,deck,active){
 keySurface||=createKeys(deck);g.save();g.translate(471,1298);g.scale(.85,.72);g.translate(-471,-1314);g.drawImage(keySurface,50,1206);
 g.fillStyle='#ead9b6';g.strokeStyle='#ead9b6';g.lineWidth=4;g.lineCap='round';g.lineJoin='round';
 const y=1311;
 // Shuffle and repeat are line icons, avoiding platform-dependent font glyphs.
 g.beginPath();g.moveTo(112,y-15);g.lineTo(122,y-15);g.lineTo(145,y+15);g.lineTo(155,y+15);g.moveTo(112,y+15);g.lineTo(122,y+15);g.lineTo(145,y-15);g.lineTo(155,y-15);g.stroke();arrow(g,155,y-15,1);arrow(g,155,y+15,1);
 triangle(g,289,y,-1);triangle(g,315,y,-1);
 if(active){g.fillRect(461,y-17,8,34);g.fillRect(478,y-17,8,34);}else triangle(g,473,y,1);
 triangle(g,629,y,1);triangle(g,655,y,1);
 g.beginPath();g.moveTo(791,y+12);g.lineTo(784,y+12);g.lineTo(784,y-15);g.lineTo(824,y-15);g.moveTo(817,y-12);g.lineTo(826,y-12);g.lineTo(826,y+15);g.lineTo(786,y+15);g.stroke();arrow(g,824,y-15,1);arrow(g,786,y+15,-1);
 // The lamp replaces the previous illuminated circular play button.
 if(active){const glow=g.createRadialGradient(473,1252,1,473,1252,17);glow.addColorStop(0,'#ffb83b88');glow.addColorStop(1,'#ffb83b00');box(g,456,1235,34,34,17,glow);}
 box(g,466,1245,14,14,7,'#10100c');box(g,468,1247,10,10,5,active?'#ffba39':'#594321');
 if(active)box(g,470,1248,5,4,2,'#fff0ad');g.restore();
 g.save();g.textAlign='center';g.font='10px Arial';g.letterSpacing='1.5px';g.fillStyle='#a6a397';
 for(const [x,label] of [[134,'RANDOM'],[302,'REW'],[473,'PLAY / PAUSE'],[642,'F.FWD'],[805,'REPEAT']])g.fillText(label,471+(x-471)*.85,1395);
 g.restore();
}
