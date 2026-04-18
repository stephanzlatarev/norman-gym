import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import YAML from "yaml";
import Brain from "@norman-gym/brain/Brain.js";
import createSamples from "@norman-gym/brain/ops/samples.js";

const name = "tic-tac-toe";
const skill = YAML.parse(fs.readFileSync(path.join("skill", name, "skill.yaml"), "utf8"));

const config = {
  attributeWidth: 64,
  objectWidth: 128,
  brainWidth: 512,
  brainLayers: 4,
  attentionHeads: 8,
  attentionGroups: 2,
  dropoutRate: 0.1,
  batchSize: 100,
};

const reloadModelAfterIteration = false;

async function loadPlaybooks() {
  const playbooks = {};

  for (const [key, script] of Object.entries(skill.playbooks)) {
    const modulePath = pathToFileURL(path.resolve("skill/" + name, script)).href;
    const mod = await import(modulePath);
    playbooks[key] = mod.default;
  }

  return playbooks;
}

async function main() {
  console.log(`Building ${name}...\n`);

  const saveFolder = process.cwd() + "/test_save";
  if (reloadModelAfterIteration && !fs.existsSync(saveFolder)) fs.mkdirSync(saveFolder, { recursive: true });

  const playbooks = await loadPlaybooks();

  let brain = new Brain(name, config, skill);
  brain.init();
  brain.summary();

  console.log("\n--- Training ---");
  for (let i = 0; i <= 10; i++) {

    const samples = createSamples(playbooks, config.batchSize);

    // Train for 10 seconds
    const loss = brain.train(samples, 10);

    // Decide test
    const act = samples.slice(0, 3).map(sample => brain.decide(sample.observe));

    console.log(`Iteration ${i}: loss=${loss.toFixed(6)} | act=${JSON.stringify(act)}`);

    if (reloadModelAfterIteration) {
      console.log("\nSaving model...");
      await brain.save(saveFolder);
      console.log("Saved to", saveFolder);

      console.log("\nLoading model...");
      brain = new Brain(name, config, skill);
      await brain.load(saveFolder);
    }
  }

  // Cleanup
  if (reloadModelAfterIteration) fs.rmSync(saveFolder, { recursive: true, force: true });

  console.log("\nDone!");
}

main().catch(console.error);
