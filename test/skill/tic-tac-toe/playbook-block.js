import { block } from './samples.js';

export default function() {
  return block[Math.floor(block.length * Math.random())];
}
