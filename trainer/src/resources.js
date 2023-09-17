import os from "os";

let clock = 0;
let cpu = 0;

export default function resources() {
  const clocknow = Date.now();
  const totalmem = os.totalmem();
  const freemem = os.freemem();

  let cpunow = 0;
  let cpucount = 0;

  for (const one of os.cpus()) {
    cpunow += one.times.user;
    cpucount++;
  }

  const measurement = {
    cpu: ((cpunow - cpu) / cpucount / (clocknow - clock)),
    ram: (totalmem - freemem) / totalmem,
  };

  clock = clocknow;
  cpu = cpunow;

  return measurement;
}
