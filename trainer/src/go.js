import * as tf from "@tensorflow/tfjs-node";
import { load, save } from "./brain.js";
import { log } from "./mongo.js";
import Samples from "./samples.js";

const BRAIN = process.env.BRAIN;

let brain;

async function onEpochEnd(epoch, logs) {
  await log(BRAIN, { epoch: epoch, ...logs });
  await save(BRAIN, brain);
}

async function go() {
  const samples = new Samples();
  await samples.init();

  brain = await load(BRAIN);

  await brain.fitDataset(tf.data.generator(samples.stream), {
    epochs: Number.MAX_SAFE_INTEGER,
    yieldEvery: "never",
    verbose: 1,
    callbacks: { onEpochEnd },
  });
}

go();
