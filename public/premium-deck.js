import {time} from './audio-utils.js';

// Coordinates of the approved 941 × 1672 facade. Animation never uses wall time.
export function drawPremiumNeedle(g,channel,level){
 const x=channel?665:275,y=326;
 const angle=-2.43+Math.min(1,Math.sqrt(Math.max(0,level))*1.5)*1.71;
 g.save();g.lineWidth=1.8;g.strokeStyle='#251c0c';g.shadowColor='#4b2c1180';g.shadowBlur=1.5;g.shadowOffsetX=2;
 g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(angle)*163,y+Math.sin(angle)*163);g.stroke();g.restore();
}
export function drawPremiumWave(g,wave,range){
 g.save();g.lineWidth=1.7;
 for(let i=0;i<240;i++){
  const height=Math.max(1,(wave[i]||0)*34),x=120+i*2.92;
  g.strokeStyle=i/240<range.fraction?'#ffb52e':'#737370';
  g.beginPath();g.moveTo(x,1081-height);g.lineTo(x,1081+height);g.stroke();
 }
 g.font='20px Arial';g.textAlign='left';g.fillStyle='#ffbd47';g.fillText(time(range.elapsed),120,1129);
 g.textAlign='right';g.fillStyle='#e6ddc7';g.fillText(time(range.duration),823,1129);g.restore();
}
export function drawPremiumIndicator(g,playing){
 if(!playing)return;
 g.save();g.fillStyle='#ffbf48';g.shadowColor='#ffac36';g.shadowBlur=5;
 g.beginPath();g.arc(294,1240,2.8,0,Math.PI*2);g.fill();g.restore();
}
export function drawPremiumControls(g,facade,{playing=false,paused=false,volume=.7}={}){
 // Reuse the photographed key face, inset by two pixels when latched.
 const x=playing?232:paused?618:null;
 if(x!==null){g.save();g.beginPath();g.rect(x,1231,121,70);g.clip();g.fillStyle='#080909';g.fillRect(x,1231,121,70);g.drawImage(facade,x,1231,121,70,x+1,1234,119,68);g.fillStyle='#00000032';g.fillRect(x,1231,121,70);g.restore();}
 // Rotate only the knob's central disc and its index; the fixed scale stays intact.
 g.save();g.translate(784,1437);g.beginPath();g.arc(0,0,40,0,Math.PI*2);g.clip();
 g.rotate((Math.max(0,Math.min(1,volume))-.5)*Math.PI*1.5);
 g.drawImage(facade,744,1397,80,80,-40,-40,80,80);g.restore();
}
