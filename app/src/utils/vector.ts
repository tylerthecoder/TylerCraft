


type IDim = [number, number, number];

class Vector<T extends number[] = IDim> {

  constructor(
    public data: number[]
  ) {}

  get(index: number): number {
    return this.data[index];
  }

  private _add(vec: Vector<T>): T {
    return this.data.map( (num, index) => num + vec.get(index)) as T;
  }
  add(vec: Vector<T>): Vector<T> {
    return new Vector(this._add(vec));
  }
  addTo(vec: Vector<T>) {
    this.data = this._add(vec);
  }

  private _sub(vec: Vector<T>): T {
    return this.data.map( (num, index) => num - vec.get(index)) as T;
  }
  sub(vec: Vector<T>): Vector<T> {
    return new Vector(this._sub(vec));
  }
  subTo(vec: Vector<T>) {
    this.data = this._sub(vec);
  }

  private _mul(vec: Vector<T>): T {
    return this.data.map((num, index) => num * vec[index]) as T;
  }
  multiply(vec: Vector<T>): Vector<T> {
    return new Vector(this._mul(vec));
  }
  multiplyTo(vec: Vector<T>) {
    this.data = this._mul(vec);
  }

  private _scalarMultiply(number: number): T {
    return this.data.map(val => val * number) as T;
  }
  scalarMultiply(number: number): Vector<T> {
    return new Vector(this._scalarMultiply(number));
  }
  scalarMultiplyBy(number: number) {
    this.data = this._scalarMultiply(number);
  }

  compare(vec: Vector<T>): boolean {
    for (let i = 0; i < vec.data.length; i++) {
      if (this.get(i) !== vec.get(i)) {
        return false;
      }
    }
    return true;
  }

//   export function arrayDist(arr1: number[], arr2: number[]) {
//     const sum = arrayAdd(arraySquare(arr1), arraySquare(arr2)).reduce((sum, current) => sum + current);
//     const dist = Math.sqrt(sum);
//     return dist;
//   }


// // export function arraySquare(arr: number[]) {
// //   return arrayMul(arr, arr);
// // }

// /** Converts rtp to xyz */
// export function sphereToCartCords(r: number, t: number, p: number): IDim {
//   const cords = [
//     r * Math.sin(p) * Math.sin(t),
//     r * Math.cos(p),
//     r * Math.sin(p) * Math.cos(t),
//   ] as IDim;
//   return cords;
// }

// export function normalize<T extends number[]>(arr: T) {
//   // find the length of the vec, if 0 then return 1
//   const length = Math.sqrt(arr.reduce((acc, cur) => acc + cur ** 2, 0) );
//   return arrayScalarMul(arr, 1 / length);
// }

// export function arrayDist(arr1: number[], arr2: number[]) {
//   const sum = arrayAdd(arraySquare(arr1), arraySquare(arr2)).reduce((sum, current) => sum + current);
//   const dist = Math.sqrt(sum);
//   return dist;
// }

// export function arrayDistSquared(arr1: number[], arr2: number[]) {
//   return arraySub(arr1, arr2).map(Math.abs).reduce((sum, current) => sum + current);
// }

// export function arrayDot<T extends number[]>(arr1: T, arr2: T): number {
//   const mults = arrayMul(arr1, arr2);

//   return sumOfArray(mults);
//   // return arr1.reduce((acc, cur, index) => acc + cur * arr2[index], 0);
// }

// export function sumOfArray(arr: number[]): number {
//   return arr.reduce((acc, cur) => acc + cur, 0);
// }

// export function arrayCross(arr1: IDim, arr2: IDim): IDim {
//   return [
//     arr1[1] * arr2[2] - arr1[2] * arr2[1],
//     arr1[2] * arr2[0] - arr1[0] * arr2[2],
//     arr1[0] * arr2[1] - arr1[1] * arr2[0],
//   ]
// }


}