import tf from "../tf.js";
import SinusoidalEncoding from "../layers/SinusoidalEncoding.js";
import GroupPositionalEncoding from "../layers/GroupPositionalEncoding.js";
import CreateTokens from "../layers/CreateTokens.js";
import SliceTokens from "../layers/SliceTokens.js";
import GroupedQueryAttention from "../layers/GroupedQueryAttention.js";
import FinalLayerNorm from "../layers/FinalLayerNorm.js";

tf.serialization.registerClass(SinusoidalEncoding);
tf.serialization.registerClass(GroupPositionalEncoding);
tf.serialization.registerClass(CreateTokens);
tf.serialization.registerClass(SliceTokens);
tf.serialization.registerClass(GroupedQueryAttention);
tf.serialization.registerClass(FinalLayerNorm);
