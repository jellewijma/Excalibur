import { watch } from "../Util/Watch";
import { Matrix } from "./matrix";
import { vec, Vector } from "./vector";

export class Transform {
  constructor(matrix?: Matrix) {
    if (matrix) {
      this.pos = matrix.getPosition();
      this.rotation = matrix.getRotation();
      this.scale = matrix.getScale();
    }
  }
  private _parent: Transform | null = null;
  get parent() {
    return this._parent;
  }
  set parent(transform: Transform) {
    if (this._parent) {
      const index = this._parent.children.indexOf(this);
      if (index > -1) {
        this._parent.children.splice(index, 1);
      }
    }
    this._parent = transform;
    if (this._parent) {
      this._parent.children.push(this);
    }
    this.flagDirty();
  }
  private children: Transform[] = [];

  private _pos: Vector = vec(0, 0);
  set pos(v: Vector) {
    this._pos = v;// TODO watch(v, () => this.flagDirty());
    this.flagDirty();
  }
  get pos() {
    return this._pos;
  }

  set globalPos(v: Vector) {
    let localPos = v;
    if (this.parent) {
      localPos = this.inverse.multiply(v);
    }
    this._pos = watch(localPos, () => this.flagDirty());
    this.flagDirty();
  }
  get globalPos() {
    if (this.parent) {
      return this.matrix.getPosition();
    }
    return this.pos;
  }

  private _rotation: number = 0;
  set rotation(rotation: number) {
    this._rotation = rotation;
    this.flagDirty();
  }
  get rotation() {
    return this._rotation;
  }

  set globalRotation(rotation: number) {
    let inverseRotation = 0;
    if (this.parent) {
      inverseRotation = this.parent.globalRotation;
    }
    this._rotation = rotation - inverseRotation;
  }

  get globalRotation() {
    if (this.parent) {
      return this.matrix.getRotation();
    }
    return this.rotation;
  }

  private _scale: Vector = vec(1, 1);
  set scale(v: Vector) {
    this._scale = watch(v, () => this.flagDirty());
    this.flagDirty();
  }
  get scale() {
    return this._scale;
  }

  set globalScale(v: Vector) {
    let inverseScale = vec(1, 1);
    if (this.parent) {
      inverseScale = this.parent.globalScale;
    }
    this.scale = v.scale(vec(1 / inverseScale.x, 1 / inverseScale.y))
  }

  get globalScale() {
    if (this.parent) {
      return this.matrix.getScale();
    }
    return this.scale;
  }

  private _isDirty = false;
  private _isInverseDirty = false;
  private _matrix = Matrix.identity();
  private _inverse = Matrix.identity();

  public get matrix() {
    if (this._isDirty) {
      if (this.parent === null) {
        this._matrix = this._calculateMatrix();
      } else {
        this._matrix = this.parent.matrix.multiply(this._calculateMatrix());
      }
      this._isDirty = false;
    }
    return this._matrix;
  }

  public get inverse() {
    if (this._isInverseDirty) {
      this._inverse = this.matrix.getAffineInverse();
      this._isInverseDirty = false;
    }
    return this._inverse;
  }

  private _calculateMatrix(): Matrix {
    const matrix = Matrix.identity()
      .translate(this.pos.x, this.pos.y)
      .rotate(this.rotation)
      .scale(this.scale.x, this.scale.y);
    return matrix;
    // return Matrix.translation(this.pos.x, this.pos.y).multiply(
    //   Matrix.rotation(this.rotation)
    // ).multiply(
    //   Matrix.scale(this.scale.x, this.scale.y)
    // );
  }


  public flagDirty() {
    this._isDirty = true;
    this._isInverseDirty = true;
    for (let i = 0; i < this.children.length; i ++) {
      this.children[i].flagDirty();
    }
  }

  public apply(point: Vector): Vector {
    return this.matrix.multiply(point);
  }

  public applyInverse(point: Vector): Vector {
    return this.inverse.multiply(point);
  }
}