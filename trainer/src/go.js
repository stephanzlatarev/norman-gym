import * as tf from "@tensorflow/tfjs-node";
import { load, save } from "./brain.js";
import { log, isLeader } from "./mongo.js";
import Samples from "./samples.js";

const BRAIN = process.env.BRAIN;

let brain;
let samples;
let control; 

async function onEpochBegin() {
  if (await isLeader(BRAIN)) {
    // Store hard samples
    samples.mode = "easy";
  } else if (samples.mode === "easy") {
    // Study hard samples
    samples.mode = "hard";
  }
}

async function onEpochEnd(epoch, logs) {
  if (samples.mode === "easy") {
    control = logs;
  } else if ((samples.mode === "hard") && (logs.error + logs.error < control.error)) {
    samples.mode = "easy";
  }

  await log(BRAIN, samples.mode, { epoch: epoch, study: { overall: { ...logs } }, control: { overall: { ...control } } });
  await save(BRAIN, brain);
}

async function go() {
  brain = await load(BRAIN);
  samples = new Samples();

  await samples.init();
  await brain.fitDataset(tf.data.generator(samples.stream), {
    epochs: Number.MAX_SAFE_INTEGER,
    yieldEvery: "never",
    verbose: 1,
    callbacks: { onEpochBegin, onEpochEnd },
  });
}

go();
