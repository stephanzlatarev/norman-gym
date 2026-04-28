import { fork } from './samples.js';

export default function() {
  return fork[Math.floor(fork.length * Math.random())];
}
