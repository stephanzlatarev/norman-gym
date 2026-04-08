import fs from "fs";
import Brain from "./brain/Brain.js";

// Load the skill yaml as a JS object
const skill = {
  name: "Play Tic-Tac-Toe",
  observe: {
    marks: {
      limit: 9,
      attributes: [
        { name: "row", type: "space", range: [1, 3] },
        { name: "col", type: "space", range: [1, 3] },
        { name: "player", type: "label", options: ["X", "O"] },
      ],
    },
  },
  act: {
    marks: {
      modify: false,
      create: 1,
      attributes: [
        { name: "row" },
        { name: "col" },
        { name: "player" },
      ],
    },
  },
};

const config = {
  attributeWidth: 64,
  objectWidth: 128,
  brainWidth: 512,
  brainLayers: 4,
  attentionHeads: 8,
  attentionGroups: 2,
  dropoutRate: 0.1,
};

const samples = [

  {
    observe: {
      marks: [
        [1, 1, "X"],
        [1, 2, "O"],
        [2, 2, "X"],
        [3, 1, "O"],
      ],
    },
    act: {
      marks: [
        [3, 3, "X"],
      ],
    }
  },
  
  {
    observe: {
      marks: [
        [1, 1, "O"],
        [1, 2, "X"],
        [2, 2, "O"],
        [3, 1, "X"],
      ],
    },
    act: {
      marks: [
        [3, 3, "O"],
      ],
    }
  },

];

async function main() {
  console.log("Building Tic-Tac-Toe Brain...\n");

  const saveFolder = process.cwd() + "/test_save";
  if (!fs.existsSync(saveFolder)) fs.mkdirSync(saveFolder, { recursive: true });

  let brain = new Brain(skill, config);
  brain.init();
  brain.summary();

  console.log("\n--- Training ---");
  for (let i = 0; i <= 10; i++) {

    // Train for 10 seconds
    const loss = brain.train(samples, 10);

    // Decide test
    const act = samples.map(sample => brain.decide(sample.observe));

    console.log(`Iteration ${i}: loss=${loss.toFixed(6)} | act=${JSON.stringify(act)}`);

    console.log("\nSaving model...");
    await brain.save(saveFolder);
    console.log("Saved to", saveFolder);

    console.log("\nLoading model...");
    brain = new Brain(skill, config);
    await brain.load(saveFolder);
  }

  // Cleanup
  fs.rmSync(saveFolder, { recursive: true, force: true });

  console.log("\nDone!");
}

main().catch(console.error);
