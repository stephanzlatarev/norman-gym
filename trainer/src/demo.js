import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import YAML from "yaml";
import Brain from "./brain/Brain.js";
import createSamples from "./brain/ops/samples.js";

const skillFolder = "docs/example/skill/tic-tac-toe";
const skill = YAML.parse(fs.readFileSync(path.join(skillFolder, "skill.yaml"), "utf8"));

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

  for (const [name, script] of Object.entries(skill.playbooks)) {
    const modulePath = pathToFileURL(path.resolve(skillFolder, script)).href;
    const mod = await import(modulePath);
    playbooks[name] = mod.default;
  }

  return playbooks;
}

async function main() {
  console.log(`Building ${skill.name}...\n`);

  const saveFolder = process.cwd() + "/test_save";
  if (reloadModelAfterIteration && !fs.existsSync(saveFolder)) fs.mkdirSync(saveFolder, { recursive: true });

  const playbooks = await loadPlaybooks();

  let brain = new Brain(skill, config);
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
      brain = new Brain(skill, config);
      await brain.load(saveFolder);
    }
  }

  // Cleanup
  if (reloadModelAfterIteration) fs.rmSync(saveFolder, { recursive: true, force: true });

  console.log("\nDone!");
}

main().catch(console.error);
