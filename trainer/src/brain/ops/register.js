import tf from "../tf.js";
import SinusoidalEncoding from "../layers/SinusoidalEncoding.js";
import GroupPositionalEncoding from "../layers/GroupPositionalEncoding.js";
import CreateObjects from "../layers/CreateObjects.js";
import SliceObjects from "../layers/SliceObjects.js";
import GroupedQueryAttention from "../layers/GroupedQueryAttention.js";
import FinalLayerNorm from "../layers/FinalLayerNorm.js";

tf.serialization.registerClass(SinusoidalEncoding);
tf.serialization.registerClass(GroupPositionalEncoding);
tf.serialization.registerClass(CreateObjects);
tf.serialization.registerClass(SliceObjects);
tf.serialization.registerClass(GroupedQueryAttention);
tf.serialization.registerClass(FinalLayerNorm);
