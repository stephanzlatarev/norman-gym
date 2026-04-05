// Polyfill for Node.js 23+ compatibility
// util.isNullOrUndefined was removed in Node.js 23
import util from "util";
if (!util.isNullOrUndefined) {
  util.isNullOrUndefined = (value) => value === null || value === undefined;
}

import * as tf from "@tensorflow/tfjs-node";
export default tf;
