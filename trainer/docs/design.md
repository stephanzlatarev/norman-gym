# BrainCreator Design Decisions

This document captures open design questions from `plan.md` with options and recommendations. Each decision is numbered for reference.

---

## Decision 1: Forward Input Format

The plan says input should be "structured per observe group, per object, and per attribute" but does not specify the concrete API.

### Options

**A. Nested JS object of tensors (one tensor per attribute per group)**
```js
{
  marks: {
    row: tf.tensor2d([[1, 1, 2, 2, 3, 3, 1, 2, 3]], [1, 9]),
    col: tf.tensor2d([[1, 2, 1, 2, 1, 2, 3, 3, 3]], [1, 9]),
    player: tf.tensor2d([[1, 2, 1, 2, 1, 2, 0, 0, 0]], [1, 9])  // 1-indexed into options, 0 = padding
  }
}
```
- Most explicit, self-documenting, easy to validate per attribute.
- Easy to align with skill definition.
- Each tensor shape: `(batch, limit)` for scalars/space, `(batch, limit)` of integer indices for labels.

**B. One tensor per group**
```js
{
  marks: tf.tensor3d([[[1,1,0], [1,2,1], ...]], [1, 9, 3])
}
```
- Fewer tensors, but mixes types (continuous + categorical) in one tensor.
- Harder to validate and encode differently per attribute.

**C. Single flat tensor**
- Loses all group/attribute structure. Requires external convention to slice.

### Decision: Option A

Aligns naturally with the skill definition, makes per-attribute encoding straightforward, and keeps validation simple. The existing playbook scripts already produce data in a similar per-attribute structure.

---

## Decision 2: Output Token Selection for Act

Each act group specifies `modify` (boolean) and `create` (non-negative integer). When `modify` is true, the brain predicts updated attributes for all observed objects in the group. When `create` > 0, the brain predicts attributes for that many new objects. Both can be active simultaneously.

The question is how to produce output tokens for modified vs. created objects.

### Options

**A. Reuse observe tokens for modify, append learned tokens for create**
- When `modify: true`, the group's observe tokens (from the transformer output) feed the output heads directly — one prediction per observed object. Each output head is a single linear layer.
- When `create > 0`, append `create` learnable "query" tokens to the transformer input for that group. These participate in self-attention and then feed the output heads (single linear layers).
- Total tokens = sum of limits + sum of create values across act groups.
- Clean separation: observe tokens handle modification; dedicated tokens handle creation.

**B. Always use dedicated tokens**
- Append `(modify ? limit : 0) + create` query tokens per act group.
- Observe tokens never directly produce output.
- Uniform handling but wastes tokens when `modify: true` (duplicates the observe slots).

**C. Cross-attention for create tokens only**
- Observe tokens produce modify outputs directly.
- Create tokens use a separate cross-attention layer attending over all object tokens.
- More flexible for creation but adds architectural complexity.

### Decision: Option A

Reusing observe tokens for modification is natural — the transformer already contextualizes them. Modify outputs predict deltas for continuous attributes and logits for labels. Appending learned query tokens only for `create` keeps the token count minimal; create outputs predict absolute values for continuous attributes (no current value exists) and logits for labels. The group-level positional encoding is added element-wise to both observe tokens and create tokens (create tokens receive the same group encoding as their corresponding observe group). The metadata map tracks: group name → observe offset/limit (for modify) and create offset/count (for new objects).

---

## Decision 3: Sinusoidal/Fourier Encoding Parameters

The plan says to apply sinusoidal encoding for `space` attributes but doesn't specify the configuration.

### Options

**A. Fixed sin+cos pairs, filling attributeWidth**
- Use `attributeWidth / 2` frequency bands.
- Frequencies: geometric series from 1.0 to 10000.0.
- Output: `attributeWidth`-dimensional vector, added to the linear projection.
- No learnable parameters in the encoding itself.

**B. Learnable Fourier features**
- Small linear layer maps the scalar value to `attributeWidth / 2`, then apply sin+cos.
- Resulting `attributeWidth` vector is added to the linear projection.
- Adds a few learnable parameters but adapts to the data range.

**C. Fixed frequencies scaled by attribute range**
- Same as A but scale input to [0, 1] using the attribute's `[min, max]` range before encoding.
- Ensures frequencies are meaningful regardless of attribute scale.

### Decision: Option C

Fixed sinusoidal with range normalization. It's parameter-free, deterministic, and the range info from the skill definition naturally normalizes the input. Use `attributeWidth / 2` sin+cos pairs with geometric frequency spacing. The encoding is added element-wise to the linear projection output (both are `attributeWidth`-sized).

---

## Decision 4: Multi-Group Token Ordering

When multiple observe groups exist, the mixer produces tokens per group. How are they arranged in the `(batch, totalObjects, objectWidth)` tensor?

### Options

**A. Concatenate in skill definition order**
- Groups are ordered by their key order in the `observe` object.
- Within a group, objects are in their input order.
- A metadata map records the offset and length of each group's slice.
- Simple and predictable.

**B. Interleave tokens across groups**
- Alternate tokens from each group.
- No clear benefit for set-style attention.

**C. Add group-type embeddings instead of fixing order**
- Concatenate in any order but add a learned "group embedding" to each token so the transformer can distinguish groups.
- Order-invariant.

### Decision: Option A with group-level positional encoding

Concatenate in definition order for deterministic slicing. Instead of learned group embeddings, apply a fixed sinusoidal positional encoding based on the group index. All tokens within the same group receive the same encoding value (their group index), so intra-group order is not imposed and set semantics are preserved. Tokens from different groups receive different encoding values, giving the transformer a zero-parameter signal to distinguish groups. Create tokens receive the same group-level encoding as the observe tokens of their corresponding group, so the transformer can associate create tokens with their group. The group-level encoding uses sin+cos pairs over `objectWidth` (not `attributeWidth`, since it is added element-wise to post-mixer token vectors which are `objectWidth`-sized), applied to the group index normalized by total number of groups. The metadata map (group name → offset, limit, modify, create) is computed once at build time.

---

## Decision 5: TensorFlow.js Model Style

### Options

**A. `tf.LayersModel` via functional API (`tf.model`)**
- Use `tf.input`, `tf.layers.*`, and wire them with `.apply()`.
- Produces a single `tf.LayersModel` with built-in `predict`, `fit`, `save/load`.
- Challenge: multiple named outputs require `tf.model({ inputs, outputs })` with output as an object or array.

**B. Custom class with manual weight management**
- Create weights via `tf.variable()`, implement forward pass in `tf.tidy()`.
- Full control but must manually handle save/load, optimizer state, and gradient computation.
- The existing `Brain.js` uses `tf.sequential` and `model.model.makeTrainFunction()`.

**C. Hybrid: functional API with custom call logic**
- Build sub-models (encoders, transformer blocks, heads) as `tf.LayersModel`.
- Compose them in a wrapper class that manages the forward pass and delegates to sub-models.
- Gets save/load for free on sub-models, while handling the grouped input/output structure in the wrapper.

### Decision: Option A (functional API), wrapped for grouped I/O

Although Option C (hybrid) was initially considered, the persistence constraint requires a single `tf.LayersModel`. The solution is to use the functional API (Option A) to wire all components — encoders, mixer, transformer blocks, output heads — into a single `tf.model({ inputs, outputs })` graph. A thin wrapper class provides the grouped I/O interface (accepting nested JS objects, returning grouped outputs) by flattening/unflattening around the model's flat tensor inputs/outputs. This gives full `save()`/`loadLayersModel()` compatibility while keeping the code organized per Decision 6's file structure.

---

## Decision 6: File Structure

### Options

**A. Single file**
- Everything in one `BrainCreator.js`.
- Simple but becomes large.

**B. Organized by role**
```
src/
  brain/
    # Polyfill
    tf.js                       # Polyfill wrapper for Node.js 23+
                                #   (util.isNullOrUndefined), re-exports
                                #   @tensorflow/tfjs-node

    # Component classes — one file per custom TF.js layer
    layers/
      SinusoidalEncoding.js       # Attribute-local sinusoidal encoding
      GroupPositionalEncoding.js   # Fixed sinusoidal group-level positional encoding
      CreateTokens.js             # Learned embeddings for create tokens
      SliceTokens.js              # Slices a token range from the sequence dimension
      GroupedQueryAttention.js    # Grouped Query Attention (reshape, scale, softmax)
      FinalLayerNorm.js           # Final layer normalization before output heads

    # Operation functions
    ops/
      register.js                 # Imports all layer classes and registers them
                                  #   with tf.serialization.registerClass()
      create.js                   # Validation, metadata computation, and model
                                  #   assembly via functional API
                                  #   Exports: build, validate, computeMetadata
      persist.js                  # File-based save/load helpers including
                                  #   brain.tf snapshot

    # Model wrapper
    Brain.js                    # Wrapper class with grouped I/O (predict,
                                #   decide, train, compile, save, load, summary)
```

**C. Two files: creator + model**
- `BrainCreator.js` for validation and assembly.
- `TransformerBrain.js` for the model class with forward pass.

### Decision: Option B

Modular files organized by role under a `brain/` subfolder. Each custom TF.js layer is its own file under `layers/`. Registration of all layer classes with `tf.serialization.registerClass()` is centralized in `ops/register.js`. Operation functions (`create.js`, `persist.js`) live under `ops/`. A `tf.js` polyfill wrapper handles Node.js 23+ compatibility (`util.isNullOrUndefined` was removed). `Brain.js` wraps the model with grouped I/O.

---

## Decision 7: Save/Load and Chained Training Compatibility

The trainer runs as a chain of short-lived Node.js processes. Each saves a training snapshot (model topology + weights + optimizer state) to MongoDB GridFS. The next process downloads the snapshot and resumes training. The existing `Brain` class implements this via:
- `model.save("file://" + folder, { includeOptimizer: true })` → produces `model.json` + `weights.bin`.
- `model.save({ save: fn })` → produces `brain.tf` (JSON with embedded weight bytes).
- `tf.loadLayersModel("file://" + folder + "/model.json")` → restores topology + weights.
- `model.compile()` → re-attaches optimizer and loss.
- `model.makeTrainFunction()` → obtains the low-level fit function for epoch loops (note: the existing Brain.js uses `model.model.makeTrainFunction()` because `tf.Sequential` wraps an inner model; the new functional-API model exposes `makeTrainFunction()` directly).

All three files (`model.json`, `weights.bin`, `brain.tf`) are stored in GridFS keyed by brain name.

### Constraints for the creator function

1. **Single model artifact**: The built model must be a single `tf.LayersModel` so that one `save()`/`loadLayersModel()` round-trip captures everything. Multiple separate models would require multiple file sets and custom orchestration incompatible with the existing GridFS logic.

2. **Custom layer registration**: Any custom TensorFlow.js layers (e.g., a multi-head attention layer, sinusoidal encoding layer) must call `tf.serialization.registerClass()` with a unique `className`. Without this, `tf.loadLayersModel()` will fail with "Unknown layer" errors.

3. **Optimizer state preservation**: `save()` is called with `includeOptimizer: true`. The model must be compiled before saving. Adam optimizer state (first and second moment estimates) is included in the weights file, allowing training to resume without a warm-up period.

4. **Deterministic reconstruction**: Given a skill and config, the creator function must produce a model with the exact same layer topology every time. This ensures that after loading weights from a snapshot, the weight shapes match. Layer names should be deterministic (not auto-generated) to avoid mismatches.

5. **Compile and train interface**: The wrapper must expose:
   - `compile(optimizer, lossWeights)` delegating to the inner `tf.LayersModel.compile()`. The loss mapping is derived automatically from the skill definition (meanSquaredError for space/scalar, categoricalCrossentropy for label). Optional `lossWeights` allow per-output weighting.
   - Access to `model.makeTrainFunction()` for the low-level training loop (functional-API models expose this directly, unlike `tf.Sequential` which requires `model.model.makeTrainFunction()`).
   - `save(path, options)` and static `load(path, skill, config)` that rebuilds the wrapper structure and loads weights into it.
   - `decide(observation)` for pure JSON-in / JSON-out inference without exposing tensors to the caller.

### Decision

Build a single `tf.LayersModel` using the functional API. All components (encoders, mixer, transformer blocks, output heads) are wired as layers within one graph via `.apply()` calls. Each act attribute produces a separate named output tensor (e.g., "marks_row_out", "marks_col_out", "marks_player_out"), and each observe attribute has a named input tensor (e.g., "marks_row_in", "marks_col_in", "marks_player_in"). The _in/_out suffix disambiguates inputs from outputs while keeping group and attribute names first for readability. This enables per-output loss functions during `compile()` — `meanSquaredError` for space/scalar outputs and `categoricalCrossentropy` for label outputs (with one-hot encoded targets). The wrapper class holds this single model and provides the grouped I/O interface (accepting nested JS objects, returning grouped outputs) by flattening/unflattening around the model's named tensor inputs/outputs. Custom layers are registered at module load time. The `save()`/`load()` methods delegate directly to the underlying `tf.LayersModel`.
