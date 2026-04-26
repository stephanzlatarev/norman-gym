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
- Each tensor shape: `(batch, limit)` for scalars, `(batch, limit, numAxes)` for space, `(batch, limit)` of integer indices for labels.

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

## Decision 2: Output Object Selection for Act

Each act group specifies `modify` (boolean) and `create` (non-negative integer). When `modify` is true, the brain predicts updated attributes for all observed objects in the group. When `create` > 0, the brain predicts attributes for that many new objects. Both can be active simultaneously.

The question is how to produce outputs for modified vs. created objects.

### Options

**A. Reuse observe objects for modify, append learned objects for create**
- When `modify: true`, the group's observe objects (from the transformer output) feed the output heads directly — one prediction per observed object. Each output head is a single linear layer.
- When `create > 0`, append `create` learnable "query" objects to the transformer input for that group. These participate in self-attention and then feed the output heads (single linear layers).
- Total objects = sum of limits + sum of create values across act groups.
- Clean separation: observe objects handle modification; dedicated objects handle creation.

**B. Always use dedicated objects**
- Append `(modify ? limit : 0) + create` query objects per act group.
- Observe objects never directly produce output.
- Uniform handling but wastes objects when `modify: true` (duplicates the observe slots).

**C. Cross-attention for create objects only**
- Observe objects produce modify outputs directly.
- Create objects use a separate cross-attention layer attending over all objects.
- More flexible for creation but adds architectural complexity.

### Decision: Option A

Reusing observe objects for modification is natural — the transformer already contextualizes them. Modify outputs predict deltas for continuous attributes and logits for labels. Appending learned query objects only for `create` keeps the object count minimal; create outputs predict absolute values for continuous attributes (no current value exists) and logits for labels. The group-level positional encoding is added element-wise to both observe objects and create objects (create objects receive the same group encoding as their corresponding observe group). The metadata map tracks: group name → observe offset/limit (for modify) and create offset/count (for new objects).

---

## Decision 3: Spatial Encoding

The plan says to apply sinusoidal encoding for `space` attributes but doesn't specify the configuration. Space attributes declare their coordinate axes (e.g., `axes: [x, y]`) so that coordinates forming a point are grouped together rather than treated as independent scalars.

### Multi-axis schema

Space attributes in the skill YAML use an `axes` field:
```yaml
- name: pos
  type: space
  axes: [x, y]
  range: [0, 300]
```
This replaces separate per-coordinate attributes (e.g., `posx`, `posy`). The input tensor shape for a space attribute is `(batch, limit, numAxes)`. The output head produces `numAxes` units. Playbook tuples contain the axis values inline at the attribute's tuple offset (e.g., `["Zealot", 150, 1, 0.1, px, py, "None", tx, ty]` where `pos` occupies two slots and `target` occupies two slots).

### Sinusoidal encoding options

**A. Fixed sin+cos pairs, filling attributeWidth**
- Use `attributeWidth / 2` frequency bands.
- Frequencies: geometric series from 1.0 to 10000.0.
- Output: `attributeWidth`-dimensional vector, added to the linear projection.
- No learnable parameters in the encoding itself.

**B. Learnable Fourier features**
- Small linear layer maps the scalar value to `attributeWidth / 2`, then apply sin+cos.
- Resulting `attributeWidth` vector is added to the linear projection.
- Adds a few learnable parameters but adapts to the data range.

**C. Fixed frequencies scaled by attribute range, split across axes**
- Scale each axis to [0, 1] using the attribute's `[min, max]` range before encoding.
- Split `attributeWidth` evenly across axes: each axis gets `attributeWidth / numAxes` dimensions.
- Within each axis allocation, use half for sin and half for cos with geometric frequency spacing.
- Ensures frequencies are meaningful regardless of attribute scale.
- The dot product between two joint encodings naturally reflects multi-dimensional proximity.

### Decision: Option C (multi-axis sinusoidal) + Rotary Positional Embeddings (RoPE)

Fixed sinusoidal with range normalization and multi-axis support. Frequency bands are split evenly across axes — for a 2D point with `attributeWidth=64`, each axis gets 32 dimensions (16 sin + 16 cos). The encoding is added element-wise to the learned dense projection output.

In addition, **multi-axis RoPE** is applied inside every attention layer to provide relative spatial awareness:
- Each attention head's dimensions are split across spatial axes. For `headDim=16` and 2 axes, each axis gets 8 dimensions (4 rotation pairs).
- Q and K vectors are rotated by angles derived from each object's spatial coordinates before the dot product.
- This makes attention scores inherently distance-dependent — closer objects attend more strongly — and the signal persists through all transformer layers (unlike additive encodings which degrade).
- The rotation uses precomputed frequencies `1/10000^(2i/axisDim)` and applies element-wise sin/cos rotation to even/odd dimension pairs.
- RoPE coordinates come from the first space attribute of each group (e.g., `pos` for both `enemies` and `warriors`). Groups without space attributes and create objects receive zero coordinates (identity rotation).
- A single `rope_coords` input tensor `(batch, totalObjects, spatialAxes)` is assembled by `flattenInput` and fed to all transformer blocks.

Both encodings are complementary: the sinusoidal input encoding provides absolute position awareness to FFN layers and output heads, while RoPE provides relative distance awareness in attention. The sinusoidal encoding is negligible in compute cost (runs once at input), and RoPE adds ~5% overhead per attention layer (linear in sequence length vs. quadratic for the attention matmuls).

For skills without any space attributes, `spatialAxes=0`, no `rope_coords` input is created, and GQA operates without rotations — standard attention with no overhead.

---

## Decision 4: Multi-Group Object Ordering

When multiple observe groups exist, the mixer produces objects per group. How are they arranged in the `(batch, totalObjects, objectWidth)` tensor?

### Options

**A. Concatenate in skill definition order**
- Groups are ordered by their key order in the `observe` object.
- Within a group, objects are in their input order.
- A metadata map records the offset and length of each group's slice.
- Simple and predictable.

**B. Interleave objects across groups**
- Alternate objects from each group.
- No clear benefit for set-style attention.

**C. Add group-type embeddings instead of fixing order**
- Concatenate in any order but add a learned "group embedding" to each object so the transformer can distinguish groups.
- Order-invariant.

### Decision: Option A with group-level positional encoding

Concatenate in definition order for deterministic slicing. Instead of learned group embeddings, apply a fixed sinusoidal positional encoding based on the group index. All objects within the same group receive the same encoding value (their group index), so intra-group order is not imposed and set semantics are preserved. Objects from different groups receive different encoding values, giving the transformer a zero-parameter signal to distinguish groups. Create objects receive the same group-level encoding as the observe objects of their corresponding group, so the transformer can associate create objects with their group. The group-level encoding uses sin+cos pairs over `objectWidth` (not `attributeWidth`, since it is added element-wise to post-mixer object vectors which are `objectWidth`-sized), applied to the group index normalized by total number of groups. The metadata map (group name → offset, limit, modify, create) is computed once at build time.

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
      CreateObjects.js            # Learned embeddings for create objects
      SliceObjects.js             # Slices a group's objects from the sequence dimension
      GroupedQueryAttention.js    # Grouped Query Attention with padding mask
                                    #   and multi-axis RoPE (reshape, mask,
                                    #   rotate Q/K, scale, softmax)
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

---

## Decision 8: Padding Mask

Each observe group has a fixed `limit`, but actual samples may contain fewer objects. Padding slots are filled with zeros, which are indistinguishable from real objects at coordinate (0, 0). This creates two problems:

1. **Attention contamination**: Padding objects participate in self-attention. Even with small attention weights, they bleed information into real objects — the model cannot achieve zero attention to padding because softmax never produces exact zeros.
2. **Loss dilution**: MSE/cross-entropy is averaged over all output slots including padding. Padding slots contribute easy near-zero loss, masking the true error on real objects. Reported loss appears lower than actual performance.

### Options

**A. Out-of-range padding values**
- Pad with values outside the attribute's `[min, max]` range (e.g., -1). The sinusoidal encoding produces distinct features, and the model learns to ignore them.
- Zero architecture changes. Approximate — some attention still leaks.

**B. Padding mask in attention + sample weights in loss**
- A `padding_mask` input tensor `(batch, totalObjects)` with 1.0 for real objects and 0.0 for padding.
- In `GroupedQueryAttention`, add `-1e9` bias to attention logits at padding key positions before softmax, making their attention weight mathematically zero.
- Per-output sample weight tensors `(batch, outputObjects)` zero out the loss contribution of padding output slots.
- Perfect isolation — padding is invisible to both attention and loss.

### Decision: Option B

A `padding_mask` input `(batch, totalObjects)` is added to the model. It is built by `flattenInput` from the actual object counts in each group (tracked by `encodeObservation`). Create objects always have mask value 1.0.

**Attention masking**: `GroupedQueryAttention` receives the mask as its 4th input (before optional RoPE coords). It converts `(1 - mask) * -1e9` into a bias tensor `(batch, 1, 1, seq)` added to the attention logits before softmax. This gives padding keys exactly zero attention weight across all heads.

**Loss masking**: `encodeBatch` produces per-output sample weight tensors using `sampleWeightMode: 'temporal'`. For modify groups, weights are 1.0 for observed objects and 0.0 for padding slots up to the limit. For create groups, all slots have weight 1.0. The weights are then **normalized so they sum to `outputObjects`** — this compensates for TF.js computing weighted loss as `sum(loss * weight) / numTimesteps` rather than `sum(loss * weight) / sum(weight)`. Without normalization, gradients are diluted by the ratio of padding to total slots (e.g., 1 real object out of 3 slots would receive 1/3 gradient strength). The model is compiled with `sampleWeightModes` set to `'temporal'` for every output, and `model.evaluate()` receives the same weights so that `measure()` reports loss on real objects only.

This ensures that:
- Padding objects cannot influence real objects through attention
- The loss reflects only real-object prediction quality
- The reported loss is directly comparable across samples with different object counts
- Gradient strength is independent of how many objects are padding

---

## Decision 9: Output Target Normalization

Space and scalar output targets are normalized to [0, 1] using the attribute's declared `[min, max]` range before training. Predictions are denormalized back to the original range in `decodeAction`.

### Motivation

Without normalization, targets in large ranges (e.g., [0, 100]) produce MSE gradients with magnitude proportional to the range. With Adam + global gradient clipping (`clipNorm`), the gradient norm across all 300K+ parameters causes the clip factor to severely throttle learning — the effective learning rate drops by orders of magnitude (e.g., `clipNorm=1.0` with raw [0,100] targets clips gradients by ~600x, reducing effective LR to ~0.0000016). The model learns glacially, taking hundreds of iterations just to shift its output from the initialization mean toward the data mean.

### Implementation

- **`encodeAction`**: For space attributes, each axis value is mapped `(value - min) / (max - min)`. For scalar attributes, the single value is mapped the same way. Padding slot values use `min` (mapping to 0.0), which is harmless since their sample weight is 0.
- **`decodeAction`**: For space attributes, each predicted axis value is mapped `value * (max - min) + min`. For scalar attributes, the same inverse transform applies.
- Label attributes are unaffected (they use one-hot encoding / cross-entropy).

This keeps all continuous targets in a narrow [0, 1] range regardless of the skill's coordinate system, ensuring consistent gradient magnitude and full utilization of the learning rate.
