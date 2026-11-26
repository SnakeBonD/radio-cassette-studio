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
