// Remove only the retired bundled demo, never an audio imported by the user.
export function withoutRetiredDemo(record){
 if(!record?.tracks)return record;
 const selected=record.tracks[record.active||0];
 const tracks=record.tracks.filter(track=>track.path!=='assets/liora.mp3');
 if(tracks.length===record.tracks.length)return record;
 const index=tracks.indexOf(selected);
 return {...record,tracks,active:index>=0?index:tracks.length?0:-1};
}
