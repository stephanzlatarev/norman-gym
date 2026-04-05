Role
You are a Senior Machine Learning Engineer specializing in object-centric Transformer architectures and modular neural systems.

Task
Implement a Brain class and creator function in Node.js that builds a Transformer-based Brain model from:
1. A Skill definition (YAML object).
2. A Config object (plain JavaScript object).

Technical Context (Mandatory)
1. Runtime: Node.js only.
2. ML framework: TensorFlow.js with tfjs-node only.
3. Module style: ES modules.
4. Do not use PyTorch, JAX, ONNX, or Python tooling.
5. Output should be implementation code only (no tests required in this task).

Input Specification
1. Skill object fields:
- name: string.
- observe: non-empty object of named observation groups.
- act: non-empty object of named action groups.
- Extra fields (e.g., playbooks) are allowed and ignored by the brain creator function.

2. Observe group definition (each key is a group name):
- limit: positive integer, max number of objects in this group.
- attributes: non-empty array of attribute definitions.

3. Observe attribute definition:
- name: string, must be unique within its group.
- type: one of space, scalar, label.
- range: required for space and scalar as [min, max].
- options: required for label as array of category strings.

4. Act group definition (each key is a group name that must exist in observe):
- modify: boolean, whether the brain modifies the observed objects in this group.
- create: non-negative integer, number of new objects the brain creates in this group.
- At least one of modify or create must be active (modify true or create > 0).
- attributes: non-empty array of attribute references.

5. Act attribute reference:
- name: string, must match an attribute name in the corresponding observe group.

6. Config object fields:
- attributeWidth: optional integer, per-attribute encoder width. Default is 128.
- objectWidth: integer, object token width (dModel in transformer terminology).
- brainWidth: optional integer, feed-forward network hidden layer width. Default is 4 × objectWidth.
- brainLayers: integer, Transformer blocks.
- attentionHeads: integer, attention heads.
- attentionGroups: integer, number of key/value groups for Grouped Query Attention. Must divide attentionHeads evenly.
- dropoutRate: number in [0, 1].

Validation Rules (Mandatory)
1. Throw clear errors for invalid input.
2. objectWidth, attentionHeads, attentionGroups, brainLayers must be positive integers.
3. objectWidth must be divisible by attentionHeads.
4. attentionHeads must be divisible by attentionGroups.
5. brainWidth, if provided, must be a positive integer.
6. attributeWidth, if provided, must be a positive integer.
7. dropoutRate must be a number in [0, 1].
8. observe must be a non-empty object of named groups.
9. act must be a non-empty object of named groups.
10. Each observe group must have a positive limit and a non-empty attributes array.
11. Each act group name must match a group name in observe.
12. Each act group must have modify (boolean) and create (non-negative integer) where at least one is active.
13. create must not be negative.
14. Each act attribute name must match an attribute name in the corresponding observe group.
15. For label attributes, options length must be at least 2.
16. For range fields, min must be less than max.
17. Group names and attribute names must not contain underscores (the underscore is used as the separator in named model outputs).
18. Attribute names must be unique within their group.

Architecture Requirements
1. Attribute Encoders (per observe group):
- For space: linear projection to attributeWidth.
- For scalar: linear projection to attributeWidth. No spatial encoding is applied (unlike space).
- For label: embedding to attributeWidth.

2. Spatial Encoding:
- For type space only (not scalar), apply sinusoidal encoding derived from the attribute value and add it element-wise to the attribute's linear projection output.
- This encoding is attribute-local and not sequence-position encoding.

3. Mixer (per observe group):
- Concatenate all observed attribute embeddings for one object within the group.
- Project concatenated vector to objectWidth using a linear layer.

4. Transformer Core:
- Set-style Transformer operating on all object tokens across all groups.
- No sequence-position encoding within a group (set semantics preserved).
- Apply fixed sinusoidal group-level positional encoding: all tokens in the same group share the same encoding value (the group index), giving the transformer a zero-parameter signal to distinguish groups. Create tokens receive the same group-level encoding as the observe tokens of their corresponding group. The group-level encoding is added element-wise to each token's objectWidth-sized vector after the mixer stage.
- Total objects equals the sum of each observe group limit plus create tokens from act groups.
- Input shape to core: (batch, totalTokens, objectWidth).
- Output shape from core: (batch, totalTokens, objectWidth).
- Each transformer block uses pre-norm architecture:
  a. LayerNorm → Grouped Query Attention (GQA) → Dropout → Residual add.
  b. LayerNorm → Feed-Forward Network → Dropout → Residual add.
- Grouped Query Attention (GQA):
  - Q projections: attentionHeads sets of projections, each of size objectWidth / attentionHeads.
  - K and V projections: attentionGroups sets of projections, each of size objectWidth / attentionHeads, shared across attentionHeads / attentionGroups query heads.
  - Output projection: concatenate all head outputs and apply a linear projection objectWidth → objectWidth (W_O).
- Feed-Forward Network (FFN):
  - Linear layer: objectWidth → brainWidth, followed by ReLU activation.
  - Linear layer: brainWidth → objectWidth.
  - Dropout applied after the second linear layer.
- Dropout is applied after the attention output projection and after the FFN, both before the residual add.
- Stack brainLayers transformer blocks sequentially.
- Apply a final LayerNorm after the last transformer block, before the output heads.

5. Output Heads (Un-mixer, per act group):
- Build one output head per act attribute within each group.
- Each output head is a single linear layer (no hidden layers).
- For space and scalar: single linear layer with output size 1 per object.
- For label: single linear layer with output size equal to number of options per object.

Tensor Contract (Mandatory)
1. Forward input covers observe data only, structured per observe group, per object, and per attribute. Each input tensor has shape (batch, limit) — always padded to the full group limit. Unfilled object slots use padding value 0 for all attribute types. Label indices are 1-based (first option = 1, second option = 2, etc.) so that 0 is unambiguously padding. The label embedding layer's inputDim must be options.length + 1 to accommodate the padding index. For example, in Tic-Tac-Toe when the game starts with 0 marks, all 9 object slots are padded with 0. Create tokens are learned embeddings injected internally and require no input data.
2. Internal post-mixer tensor must be (batch, totalTokens, objectWidth) where totalTokens is the sum of all observe group limits plus all act group create values.
3. Forward output must be an object keyed by group name, then by act attribute name.
4. The underlying tf.LayersModel must expose each act attribute as a separate named output so that per-output loss functions can be assigned during compile. Named outputs use the convention groupName_attributeName_out (e.g., "marks_row_out", "marks_col_out", "marks_player_out"). Named inputs use groupName_attributeName_in (e.g., "marks_row_in", "marks_col_in", "marks_player_in"). The _in/_out suffix disambiguates inputs from outputs while keeping the most significant parts (group and attribute) first for readability in model summaries.
5. Each output tensor shape (where outputObjects = (modify ? limit : 0) + create):
- space or scalar: (batch, outputObjects, 1).
- label: (batch, outputObjects, numOptions).

Loss Function Strategy (Mandatory)
1. The model produces mixed output types: continuous (space, scalar) and categorical (label).
2. Each act attribute is a separate named output of the underlying tf.LayersModel.
3. During compile, assign per-output loss functions:
- space and scalar outputs: meanSquaredError.
- label outputs: categoricalCrossentropy (expects one-hot encoded targets of shape (batch, outputObjects, numOptions)).
4. Loss weights per output may be specified via the lossWeights option in compile.
5. The wrapper must build the loss mapping automatically from the skill definition.

Prediction Semantics
1. Both modify and create output heads predict the target state of objects. Modify heads apply to the observed objects in the group; create heads apply to newly created objects. The output heads are identical in structure — the distinction is only which transformer tokens they read from.

2. Continuous attributes (space, scalar):
- For modify outputs: model predicts delta values. Next value is current value plus predicted delta.
- For create outputs: model predicts absolute values directly (no current value exists).
- Optionally clamp to attribute range after reconstruction.

3. Label attributes:
- For both modify and create outputs: model predicts logits over label options.
- Inference class is argmax over logits.

Persistence and Chained Training (Mandatory)
The trainer runs as a chain of Node.js processes. Each process may be restarted at any time and must resume training from the last saved snapshot rather than starting from scratch. The existing Brain class implements this pattern:

1. Save contract:
- The model must be saveable via `tf.LayersModel.save()` to produce a `model.json` topology file and a `weights.bin` binary weights file.
- Save must include optimizer state (`includeOptimizer: true`) so that momentum/Adam state is preserved across restarts.
- An additional serialized snapshot file (`brain.tf`) is saved containing the full model artifact as JSON with weight data as a byte array.
- All three files are uploaded to MongoDB GridFS keyed by brain name.

2. Load contract:
- On startup, the process downloads `model.json` and `weights.bin` from GridFS to a local folder.
- The model is restored via `tf.loadLayersModel("file://" + folder + "/model.json")`.
- After loading, `model.compile()` is called to re-attach the optimizer and loss function.
- `model.makeTrainFunction()` is called to obtain a low-level training function for epoch loops (note: the existing Brain.js uses `model.model.makeTrainFunction()` because `tf.Sequential` wraps an inner model; the new functional-API model exposes `makeTrainFunction()` directly).
- The loaded model must produce identical forward pass results and continue training seamlessly.

3. Compatibility requirements for the creator function:
- The built model (or each sub-model in a hybrid approach) must be a `tf.LayersModel` compatible with `save()` and `tf.loadLayersModel()`.
- All custom layers, if any, must be registered with `tf.serialization.registerClass()` so they survive save/load.
- The wrapper class must support reconstructing its structure from a saved snapshot: given a skill and config, it must be able to rebuild the wrapper and load weights into the correct sub-models.
- The compile step must use a configurable optimizer (default: Adam) and per-output loss functions derived from the skill definition (meanSquaredError for space/scalar, categoricalCrossentropy for label).
- The `makeTrainFunction()` pattern must be supported for low-level training loops.

Deliverables
1. Brain creator function with (skill, config) input parameters.
2. Underlying Transformer model.
3. A short executable script that builds a Tic-Tac-Toe Brain from the example skill.yaml and a sample config.

Acceptance Criteria
1. build(skill, config) returns a model with a working forward pass.
2. Forward output keys are grouped by act group name, then by attribute name.
3. Output tensor shapes match the Tensor Contract for all act groups and attributes.
4. Invalid skill/config inputs throw clear, actionable errors.
5. Tic-Tac-Toe example initialization runs successfully in Node.js with tfjs-node.
6. The model can be saved and loaded via tf.LayersModel.save() and tf.loadLayersModel().
7. A loaded model continues training seamlessly with optimizer state preserved.
8. Any custom layers are registered with tf.serialization.registerClass().

Implementation Notes
1. Confirm that tf.layers.dropout correctly respects the training flag when used with the functional API and makeTrainFunction(). Verify during implementation.

Out of Scope
1. Full training pipeline.
2. Hyperparameter search.
3. Distributed training.
4. Reinforcement learning policy loop integration.

Example Skill Blueprint (Tic-Tac-Toe)
```
name: "Play Tic-Tac-Toe"
observe:
  marks:
    limit: 9
    attributes:
      - name: "row"
        type: "space"
        range: [1, 3]
      - name: "col"
        type: "space"
        range: [1, 3]
      - name: "player"
        type: "label"
        options: ["X", "O"]
act:
  marks:
    modify: false
    create: 1
    attributes:
      - name: "row"
      - name: "col"
      - name: "player"
```

Example Config
```
attributeWidth: 64
objectWidth: 128
brainWidth: 512
brainLayers: 4
attentionHeads: 8
attentionGroups: 2
dropoutRate: 0.1
```
