export function arrayAdd(arr1: number[], arr2: number[]) {
  if (arr1.length !== arr2.length) {
    throw new Error("Arrays not same length");
  }
  const newArray: number[] = [];
  for (let i = 0; i < arr1.length; i++) {
    newArray[i] = arr1[i] + arr2[i];
  }
  return newArray;
}
