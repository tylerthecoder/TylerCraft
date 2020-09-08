type IDim = [number, number, number];


interface IItterable {
  start: number;
  end: number;
  step?: number;
}

export class Vector<T extends number[] = IDim> {
  static unitVectors3D = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1]
  ].map(d => new Vector(d));

  static unitVectors2D = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ].map(d => new Vector(d));

  static unitVectors2DIn3D = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1],
  ].map(d => new Vector(d));

  static xVectors = [
    [1,0,1],
    [1,1,1],
    [0,1,0],
    [0,0,0],
    [0,0,1],
    [0,1,1],
    [1,1,0],
    [1,0,0],
  ];

  static fromString<S extends number[] = [number, number, number]>(str: string): Vector<S> {
    const ords = str.split(",").map(n => parseInt(n));
    return new Vector(ords);
  }

  // this might be hard
  static itterable(itterators: IItterable[]) {

  }

  constructor(
    public data: number[]
  ) { }

  // this might be a very slow function to call so often
  // maybe memoize the results? Don't know if that actually does anything in javascript
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
  scalarMultiplyTo(number: number) {
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

  getSphereAngles() {
    const x = this.data[0];
    const y = this.data[1];
    const z = this.data[2];

    const theta = Math.atan2(z, x);
    const phi = Math.atan2(Math.sqrt(x * x + z * z), y);

    return new Vector2D([theta, phi]);
  }

  toCartesianCoords(): Vector<T> {
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

  normalize() {
    const length = Math.sqrt(this.data.reduce((acc, cur) => acc + cur ** 2, 0));
    return this.scalarMultiply(1 / length);
  }


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

