export default function createSamples(playbooks, count) {
  const sources = Object.values(playbooks);
  const samples = [];

  while (samples.length < count) {
    for (let i = 0; i < sources.length && samples.length < count; i++) {
      samples.push(sources[i]());
    }
  }

  return samples;
}
