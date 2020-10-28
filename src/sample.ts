const {sample, prng} = require('implausible');

let __x = 0;
let __seed: string = '';

function instanceSeed(seed: string) {
  const iseed = `${__x}${seed}`;
  __x += 1;
  return iseed;
}

export function reset() {
  __x = 0;
  __seed = '';
}

export function random(seed?: string) {
  if (!__seed && seed) __seed = seed;
  if (!__seed && !seed) throw new Error('missing seed!');
  return prng({seed: instanceSeed(__seed)});
}

export function sampleCollection<T>(seed: string, obj: T): keyof T {
  return sample({collection: obj, seed: instanceSeed(seed)});
}

export function randomInt(seed: string, min: number, max: number) {
  const intmin = Math.ceil(min);
  const intmax = Math.floor(max);
  return Math.round(intmin + random(seed) * (intmax - intmin));
}

export function paretoSample<T>(
  seed: string,
  arr: Array<T>,
  shapeParam: number = 2,
  min: number = 0,
): T {
  const i = Math.max(
    min,
    Math.floor(Math.pow(random(seed), shapeParam) * arr.length),
  );
  return arr[i];
}

export function uniformSample<T>(seed: string, arr: Array<T>): T {
  const i = Math.floor(random(seed) * arr.length);
  return arr[i];
}

export function somewhatGaussian(seed: string) {
  return (random(seed) + random(seed)) * 0.5;
}
