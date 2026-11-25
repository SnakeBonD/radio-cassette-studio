const panel=document.createElement('aside');panel.className='pwa-panel';
const install=document.createElement('button');install.textContent='Installer l’application';install.hidden=true;
const note=document.createElement('span');note.setAttribute('role','status');
panel.append(install,note);document.body.append(panel);
let prompt;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;install.hidden=false;});
install.onclick=async()=>{if(!prompt)return;await prompt.prompt();const result=await prompt.userChoice;prompt=null;install.hidden=true;if(result.outcome==='accepted')note.textContent='Application installée.';};
window.addEventListener('appinstalled',()=>{install.hidden=true;});
const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
if(!standalone&&/iPhone|iPad|iPod/.test(navigator.userAgent))note.textContent='Pour installer : Partager → Sur l’écran d’accueil.';
function connectivity(){if(!navigator.onLine)note.textContent='Hors connexion : vos fichiers locaux restent disponibles. Les radios nécessitent Internet.';else if(note.textContent.startsWith('Hors connexion'))note.textContent='Connexion rétablie.';}
window.addEventListener('offline',connectivity);window.addEventListener('online',connectivity);connectivity();
if('serviceWorker' in navigator){
 navigator.serviceWorker.register('/sw.js').then(async registration=>{
  await navigator.serviceWorker.ready;
  if(navigator.onLine&&!note.textContent)note.textContent='Lecteur prêt hors connexion. Conservez vos audios sur cet appareil.';
  const update=()=>{if(registration.waiting&&navigator.serviceWorker.controller)note.textContent='Mise à jour prête : fermez les fenêtres de l’application puis rouvrez-la.';};
  update();registration.addEventListener('updatefound',()=>registration.installing?.addEventListener('statechange',update));
 }).catch(()=>{if(navigator.onLine)note.textContent='Le mode hors connexion n’a pas pu être préparé. Réessayez lors de votre prochaine visite.';});
}
