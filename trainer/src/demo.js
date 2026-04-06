import fs from "fs";
import tf from "./brain/tf.js";
import Brain from "./brain/Brain.js";

// Load the skill yaml as a JS object
const skillYaml = {
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

async function main() {
  console.log("Building Tic-Tac-Toe Brain...\n");

  const saveFolder = process.cwd() + "/test_save";
  if (!fs.existsSync(saveFolder)) fs.mkdirSync(saveFolder, { recursive: true });

  // Forward pass test: a board with 4 marks
  // X at (1,1), O at (1,2), X at (2,2), O at (3,1), rest padded with 0
  const input = {
    marks: {
      row:    tf.tensor2d([[1, 1, 2, 3, 0, 0, 0, 0, 0]], [1, 9]),
      col:    tf.tensor2d([[1, 2, 2, 1, 0, 0, 0, 0, 0]], [1, 9]),
      player: tf.tensor2d([[1, 2, 1, 2, 0, 0, 0, 0, 0]], [1, 9], "int32"),
    },
  };

  // Training test: 10 iterations of 10 seconds each
  // Target: row=3, col=3, player="X" (index 1 -> one-hot [1, 0])
  const target = {
    marks_row_out:    tf.tensor3d([[[3]]], [1, 1, 1]),
    marks_col_out:    tf.tensor3d([[[3]]], [1, 1, 1]),
    marks_player_out: tf.tensor2d([[1, 0]], [1, 2]).reshape([1, 1, 2]),
  };

  let brain = new Brain(skillYaml, config);
  brain.init();
  brain.summary();

  console.log("\n--- Training ---");
  for (let i = 0; i <= 10; i++) {

    // Train for 10 seconds
    const loss = brain.train(input, target, 10);

    // Decide test
    const act = brain.decide({
      marks: [
        [1, 1, "X"],
        [1, 2, "O"],
        [2, 2, "X"],
        [3, 1, "O"],
      ]
    });

    console.log(`Iteration ${i}: loss=${loss.toFixed(6)} | act=${JSON.stringify(act)}`);

    console.log("\nSaving model...");
    await brain.save(saveFolder);
    console.log("Saved to", saveFolder);

    console.log("\nLoading model...");
    brain = new Brain(skillYaml, config);
    await brain.load(saveFolder);
  }

  // Cleanup
  fs.rmSync(saveFolder, { recursive: true, force: true });

  console.log("\nDone!");
}

main().catch(console.error);
