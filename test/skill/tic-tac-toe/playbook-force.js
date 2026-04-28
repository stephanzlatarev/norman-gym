import { force } from './samples.js';

export default function() {
  return force[Math.floor(force.length * Math.random())];
}