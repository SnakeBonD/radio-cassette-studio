import {peaks} from './audio-utils.js';

export function createTrimEditor(document, onChange) {
  const root = document.getElementById('trimEditor');
  const canvas = document.getElementById('trimWave');
  const context = canvas.getContext('2d');
  const selection = document.getElementById('trimSelection');
  const handles = [document.getElementById('trimStart'), document.getElementById('trimEnd')];
  let audio = null;
  let start = 0;
  let end = 0;
  let disabled = true;
  let lastRender = null;

  function change(index, value) {
    if (!audio || disabled) return;
    const gap = Math.min(0.1, audio.duration);
    if (index === 0) start = Math.max(0, Math.min(value, end - gap));
    else end = Math.min(audio.duration, Math.max(value, start + gap));
    onChange(start, end);
  }

  handles.forEach((handle, index) => {
    let pointer = null;
    let dragOffset = 0;
    handle.addEventListener('pointerdown', event => {
      if (disabled || !audio) return;
      const bounds = root.getBoundingClientRect();
      pointer = event.pointerId;
      dragOffset = event.clientX - bounds.left - (index === 0 ? start : end) / audio.duration * bounds.width;
      handle.setPointerCapture(pointer);
      handle.focus();
      event.preventDefault();
    });
    handle.addEventListener('pointermove', event => {
      if (pointer !== event.pointerId || !audio) return;
      const bounds = root.getBoundingClientRect();
      if (!bounds.width) return;
      change(index, (event.clientX - bounds.left - dragOffset) / bounds.width * audio.duration);
    });
    const release = () => { pointer = null; };
    handle.addEventListener('pointerup', release);
    handle.addEventListener('pointercancel', release);
    handle.addEventListener('lostpointercapture', release);
    handle.addEventListener('keydown', event => {
      if (!audio || disabled) return;
      const current = index === 0 ? start : end;
      const step = event.shiftKey ? 1 : 0.1;
      const values = {ArrowLeft: current - step, ArrowDown: current - step,
        ArrowRight: current + step, ArrowUp: current + step,
        Home: 0, End: audio.duration};
      if (!(event.key in values)) return;
      event.preventDefault();
      change(index, values[event.key]);
    });
  });

  function render(buffer, from, to, busy) {
    if (lastRender && lastRender[0] === buffer && lastRender[1] === from && lastRender[2] === to && lastRender[3] === busy) return;
    lastRender = [buffer, from, to, busy];
    if (buffer !== audio) {
      audio = buffer;
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (audio) {
        const waveform = peaks(audio.getChannelData(0), 400);
        context.strokeStyle = '#a6a39a';
        context.lineWidth = 1;
        context.beginPath();
        waveform.forEach((value, index) => {
          const height = Math.max(1, value * 52);
          context.moveTo(index * 2 + 1, 60 - height);
          context.lineTo(index * 2 + 1, 60 + height);
        });
        context.stroke();
      }
    }
    start = from;
    end = to;
    disabled = busy || !audio;
    const duration = audio?.duration || 1;
    selection.style.left = (start / duration * 100) + '%';
    selection.style.width = ((end - start) / duration * 100) + '%';
    handles.forEach((handle, index) => {
      const value = index === 0 ? start : end;
      handle.disabled = disabled;
      handle.style.left = (value / duration * 100) + '%';
      handle.setAttribute('aria-valuemin', String(index === 0 ? 0 : Math.min(duration, start + Math.min(0.1, duration))));
      handle.setAttribute('aria-valuemax', String(index === 0 ? Math.max(0, end - Math.min(0.1, duration)) : duration));
      handle.setAttribute('aria-valuenow', String(value));
      handle.setAttribute('aria-valuetext', value.toFixed(1) + ' secondes');
    });
  }
  return {render};
}
