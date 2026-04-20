const DEFAULT_PROFILE_CPU_UNITS = 1;
const DEFAULT_PROFILE_RAM_GB = 2;
const BYTES_PER_GB = 1024 * 1024 * 1024;

const PROFILE_CPU_UNITS = parseFloat(process.env.PROFILE_CPU_UNITS) || DEFAULT_PROFILE_CPU_UNITS;
const PROFILE_RAM_GB = parseFloat(process.env.PROFILE_RAM_GB) || DEFAULT_PROFILE_RAM_GB;
const PROFILE_RAM_BYTES = PROFILE_RAM_GB * BYTES_PER_GB;

let clock = process.hrtime.bigint();
let cpu = process.cpuUsage();

export default function resources() {
  const clocknow = process.hrtime.bigint();
  const cpunow = process.cpuUsage();
  const memory = process.memoryUsage();

  const elapsedMicros = Number(clocknow - clock) / 1000;
  const deltaUser = cpunow.user - cpu.user;
  const deltaSystem = cpunow.system - cpu.system;
  const cpuUnits = elapsedMicros > 0 ? (deltaUser + deltaSystem) / elapsedMicros : 0;

  const measurement = {
    cpu: sanitize(cpuUnits / PROFILE_CPU_UNITS),
    ram: sanitize(memory.rss / PROFILE_RAM_BYTES),
  };

  clock = clocknow;
  cpu = cpunow;

  return measurement;
}

function sanitize(value) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
