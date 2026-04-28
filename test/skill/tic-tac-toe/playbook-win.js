import { win } from './samples.js';

export default function() {
  return win[Math.floor(win.length * Math.random())];
}
