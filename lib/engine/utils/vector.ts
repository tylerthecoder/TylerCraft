type IDim = [number, number, number];

// type VectorIndex = bigint;
export type VectorIndex = string;

export enum Direction {
  Forwards = 0,
  Backwards = 1,
  Left = 2,
  Right = 3,
  Up = 4,
  Down = 5,
}

export const getDirectionFromString = (dir: string): Direction => {
  switch (dir) {
    case "Up":
      return Direction.Up;
    case "Down":
      return Direction.Down;
    case "West":
      return Direction.Left;
    case "East":
      return Direction.Right;
    case "North":
      return Direction.Forwards;
    case "South":
      return Direction.Backwards;
    default:
      throw new Error(`Invalid direction: ${dir}`);
  }
};

export const ALL_DIRECTIONS = [
  Direction.Forwards,
  Direction.Backwards,
  Direction.Left,
  Direction.Right,
  Direction.Up,
  Direction.Down,
];

export class Vector<T extends number[] = IDim> {
  static xVectors = [
    [1, 0, 1],
    [1, 1, 1],
    [0, 1, 0],
    [0, 0, 0],
    [0, 0, 1],
    [0, 1, 1],
    [1, 1, 0],
    [1, 0, 0],
  ];

  constructor(public data: number[]) {}

  equals(vec: Vector<T>): boolean {
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] !== vec.get(i)) return false;
    }
    return true;
  }

  get(index: number): number {
    return this.data[index];
  }

  set(index: number, value: number) {
    this.data[index] = value;
    return this;
  }

  copy(): Vector<T> {
    return new Vector(this.data.slice(0));
  }

  floor(): Vector<T> {
    return new Vector(this.data.map(Math.floor));
  }

  static _add<T extends number[]>(vec1: Vector<T>, vec2: Vector<T>) {
    return vec1.data.map((num, index) => num + vec2.get(index)) as T;
  }

  static _sub<T extends number[]>(vec1: Vector<T>, vec2: Vector<T>) {
    return vec1.data.map((num, index) => num - vec2.get(index)) as T;
  }

  static _mul<T extends number[]>(vec1: Vector<T>, vec2: Vector<T>) {
    return vec1.data.map((num, index) => num * vec2.get(index)) as T;
  }

  static _scalarMul<T extends number[]>(vec1: Vector<T>, num: number) {
    return vec1.data.map((val) => val * num) as T;
  }

  static _normalize<T extends number[]>(vec1: Vector<T>) {
    const length = Math.sqrt(vec1.data.reduce((acc, cur) => acc + cur ** 2, 0));
    return this._scalarMul(vec1, 1 / length);
  }

  static _floor<T extends number[]>(vec1: Vector<T>) {
    return vec1.data.map(Math.floor) as T;
  }

  private _sub(vec: Vector<T>): T {
    return this.data.map((num, index) => num - vec.get(index)) as T;
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
    return this.data.map((val) => val * number) as T;
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

  magnitude(): number {
    return this.data.reduce((acc, n) => acc + n ** 2, 0);
  }

  /*================
      3D Stuff
  ================*/

  getSphereAngles() {
    const x = this.data[0];
    const y = this.data[1];
    const z = this.data[2];

    const theta = Math.atan2(z, x);
    const phi = Math.atan2(Math.sqrt(x * x + z * z), y);

    return new Vector2D([theta, phi]);
  }

  rotateY(angle: number) {
    const x = this.data[0];
    const y = this.data[1];
    const z = this.data[2];
    return new Vector3D([
      x * Math.cos(angle) - z * Math.sin(angle),
      y,
      x * Math.sin(angle) + z * Math.cos(angle),
    ]);
  }

  rotateZ(angle: number) {
    const x = this.data[0];
    const y = this.data[1];
    const z = this.data[2];
    return new Vector3D([
      x * Math.cos(angle) - y * Math.sin(angle),
      x * Math.sin(angle) + y * Math.cos(angle),
      z,
    ]);
  }
}

export class Vector2D extends Vector<[number, number]> {
  static unitVectors = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ].map((d) => new Vector2D(d));

  static edgeVectors = [
    [1, 1],
    [1, 0],
    [1, -1],
    [0, 1],
    [0, -1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
  ].map((d) => new Vector2D(d));

  static squareVectors = Vector2D.edgeVectors.concat(new Vector2D([0, 0]));

  add(vec: Vector2D): Vector2D {
    return new Vector2D(Vector._add(this, vec));
  }

  multiply(vec: Vector2D): Vector2D {
    return new Vector2D(Vector._mul(this, vec));
  }

  scalarMultiply(number: number): Vector2D {
    return new Vector2D(Vector._scalarMul(this, number));
  }

  floor(): Vector2D {
    return new Vector2D(Vector._floor(this));
  }

  copy(): Vector2D {
    return new Vector2D(this.data.slice(0));
  }

  insert(num: number, index: number): Vector3D {
    return new Vector3D([
      ...this.data.slice(0, index),
      num,
      ...this.data.slice(index),
    ]);
  }

  // This should only be called if the data in here are ints
  static fromIndex(index: VectorIndex) {
    // const data1 = index >> 16;
    // const data2 = index - data1;
    // return new Vector2D([data1, data2]);
    const ords = index.split(",").map((n) => parseInt(n));
    return new Vector2D(ords);
  }

  toIndex(): VectorIndex {
    // const part1 = BigInt(this.data[0]) << 16n;
    // const part2 = BigInt(this.data[1]);
    // return part1 + part2;
    return this.data.join(",");
  }

  toCartIntObj(): { x: number; y: number } {
    // convert numbers to ints
    return {
      x: Math.round(this.data[0]),
      y: Math.round(this.data[1]),
    };
  }

  toCartesianCoords(): Vector2D {
    const r = this.data[0];
    const t = this.data[1];

    const cords = [
      r * Math.cos(t), // x
      r * Math.sin(t), // z
    ];

    return new Vector2D(cords);
  }
}
export class Vector3D extends Vector<[number, number, number]> {
  static get zero() {
    return new Vector3D([0, 0, 0]);
  }

  static unitVectors = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ].map((d) => new Vector3D(d));

  static unitVectorsStripY = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1],
  ].map((d) => new Vector3D(d));

  static edgeVectors = [
    [1, 1, 0],
    [1, -1, 0],
    [1, 0, 1],
    [1, 0, -1],
    [-1, 1, 0],
    [-1, -1, 0],
    [-1, 0, 1],
    [-1, 0, -1],
    [0, 1, 1],
    [0, 1, -1],
    [0, -1, 1],
    [0, -1, -1],
  ].map((d) => new Vector3D(d));

  static edgeVectorsStripY = [
    [1, 0, 1],
    [1, 0, 0],
    [1, 0, -1],
    [0, 0, 1],
    [0, 0, -1],
    [-1, 0, 1],
    [-1, 0, 0],
    [-1, 0, -1],
  ].map((d) => new Vector3D(d));

  static cornerVectors = [
    [1, 1, 1],
    [1, 1, -1],
    [1, -1, 1],
    [1, -1, -1],
    [-1, 1, 1],
    [-1, 1, -1],
    [-1, -1, 1],
    [-1, -1, -1],
  ].map((d) => new Vector3D(d));

  static fromIndex(index: VectorIndex): Vector3D {
    // const data1 = index >> 16n;
    // const data2 = index - data1 << 16;
    // const data2 = index - data1;
    // return new Vector3D([data1, data2]);
    const ords = index.split(",").map((n) => parseInt(n));
    return new Vector3D(ords);
  }

  static fromDirection(direction: Direction): Vector3D {
    console.log("From direction", direction);
    switch (direction) {
      case Direction.Forwards:
        return new Vector3D([0, 0, 1]);
      case Direction.Backwards:
        return new Vector3D([0, 0, -1]);
      case Direction.Right:
        return new Vector3D([1, 0, 0]);
      case Direction.Left:
        return new Vector3D([-1, 0, 0]);
      case Direction.Up:
        return new Vector3D([0, 1, 0]);
      case Direction.Down:
        return new Vector3D([0, -1, 0]);
    }
  }

  toIndex(): VectorIndex {
    // const part1 = BigInt(this.data[0]) << (32n + 8n); // 32 bits
    // const part2 = BigInt(this.data[1]) << (32n); // 8 bits
    // const part3 = BigInt(this.data[2]) // 32 bits
    // const res = part1 + part2 + part3;
    // return res;
    return this.data.join(",");
  }

  toXYZObj(): { x: number; y: number; z: number } {
    return {
      x: this.data[0],
      y: this.data[1],
      z: this.data[2],
    };
  }

  toCartIntObj(): { x: number; y: number; z: number } {
    // convert numbers to ints
    return {
      x: Math.round(this.data[0]),
      y: Math.round(this.data[1]),
      z: Math.round(this.data[2]),
    };
  }

  add(vec: Vector3D): Vector3D {
    return new Vector3D(Vector._add(this, vec));
  }

  sub(vec: Vector3D): Vector3D {
    return new Vector3D(Vector._sub(this, vec));
  }

  multiply(vec: Vector3D): Vector3D {
    return new Vector3D(Vector._mul(this, vec));
  }

  scalarMultiply(num: number): Vector3D {
    return new Vector3D(Vector._scalarMul(this, num));
  }

  copy(): Vector3D {
    return new Vector3D(this.data.slice(0));
  }

  normalize(): Vector3D {
    return new Vector3D(Vector._normalize(this));
  }

  floor(): Vector3D {
    return new Vector3D(Vector._floor(this));
  }

  stripY(): Vector2D {
    return new Vector2D([this.data[0], this.data[2]]);
  }

  toCartesianCoords(): Vector3D {
    const r = this.data[0];
    const t = this.data[1];
    const p = this.data[2];

    const cords = [
      r * Math.sin(p) * Math.cos(t), // x
      r * Math.cos(p), // y
      r * Math.sin(p) * Math.sin(t), // z
    ];

    return new Vector3D(cords);
  }
}
