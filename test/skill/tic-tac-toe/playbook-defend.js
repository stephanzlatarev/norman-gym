import { defend } from './samples.js';

export default function() {
  return defend[Math.floor(defend.length * Math.random())];
}