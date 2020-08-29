type IDim = [number, number, number];


export class Vector<T extends number[] = IDim> {
  static unitVectors3D = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1]
  ].map(d => new Vector(d));

  static fromString<S extends number[] = [number, number, number]>(str: string): Vector<S> {
    const ords = str.split(",").map(n => parseInt(n));
    return new Vector(ords);
  }


  constructor(
    public data: number[]
  ) {

  }

  toString(): string {
    return this.data.
      // combine with commas
      reduce((acc, cur) => acc + cur + ",", "").
      // remove last comma
      slice(0, -1);
  }

  get(index: number): number {
    return this.data[index];
  }

  set(index: number, value: number) {
    this.data[index] = value;
  }

  copy(): Vector<T> {
    return new Vector(this.data.slice(0));
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
    return this.data.map((num, index) => num * vec.get(index)) as T;
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

  sumOfComponents(): number {
    return this.data.reduce((acc, cur) => acc + cur);
  }

  squareDistFrom(vec: Vector<T>) {
    const diff = this.sub(vec);
    const squareDist = diff.multiply(diff).sumOfComponents();
    return squareDist;
  }

  distFrom(vec: Vector<T>): number {
    const squareDist = this.squareDistFrom(vec);
    return Math.sqrt(squareDist);
  }

  dot(vec: Vector<T>): number {
    const mults = this.multiply(vec);

    return mults.sumOfComponents();
  }

  getSphereCords(): Vector<T> {
    const r = this.data[0];
    const t = this.data[1];
    const p = this.data[2];

    const cords = [
      r * Math.sin(p) * Math.sin(t),
      r * Math.cos(p),
      r * Math.sin(p) * Math.cos(t),
    ];

    return new Vector<T>(cords);
  }

// export function normalize<T extends number[]>(arr: T) {
//   // find the length of the vec, if 0 then return 1
//   const length = Math.sqrt(arr.reduce((acc, cur) => acc + cur ** 2, 0) );
//   return arrayScalarMul(arr, 1 / length);
// }


// export function arrayCross(arr1: IDim, arr2: IDim): IDim {
//   return [
//     arr1[1] * arr2[2] - arr1[2] * arr2[1],
//     arr1[2] * arr2[0] - arr1[0] * arr2[2],
//     arr1[0] * arr2[1] - arr1[1] * arr2[0],
//   ]
// }


}



export class Vector2D extends Vector<[number, number]> {};
export class Vector3D extends Vector<[number, number, number]> {};

