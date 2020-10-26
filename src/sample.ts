const {sample} = require('implausible');

export function sampleCollection<T>(obj: T): keyof T {
  return sample({collection: obj});
}

export function randomInt(min: number, max: number) {
  const intmin = Math.ceil(min);
  const intmax = Math.floor(max);
  return Math.round(intmin + Math.random() * (intmax - intmin));
}

export function paretoSample<T>(arr: Array<T>, shapeParam: number = 2): T {
  const i = Math.floor(Math.pow(Math.random(), shapeParam) * arr.length);
  return arr[i];
}

export function uniformSample<T>(arr: Array<T>): T {
  const i = Math.floor(Math.random() * arr.length);
  return arr[i];
}

export function somewhatGaussian() {
  return (Math.random() + Math.random()) * 0.3333;
}
