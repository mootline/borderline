function flattenObject(obj) {
  let result = [];

  for (let key in obj) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      result = result.concat(flattenObject(obj[key]));
    } else {
      result.push(obj[key]);
    }
  }

  return result;
}

function unflattenArray(array, prototype) {
  let obj = {};
  let index = 0;

  for (let key in prototype) {
    if (typeof prototype[key] === "object" && prototype[key] !== null) {
      let subArray = array.slice(
        index,
        index + Object.keys(prototype[key]).length,
      );
      obj[key] = unflattenArray(subArray, prototype[key]);
      index += Object.keys(prototype[key]).length;
    } else {
      obj[key] = array[index];
      index++;
    }
  }

  return obj;
}

export class VecSet {
  private _data: Map<number, VecSet>;
  private _is: boolean = false;

  constructor(data: any[]) {
    this._data = new Map();
    data.forEach((value) => this.add(value));
  }

  add(key: object | number[]) {
    if (key instanceof Array) {
      this.addArray(key);
    } else {
      this.addObject(key);
    }
  }

  addObject(key: object) {
    this.addArray(flattenObject(key));
  }

  addArray(key: number[]) {
    if (key.length == 0) {
      this._is = true;
      return;
    }
    if (!this._data.has(key[0])) {
      this._data.set(key[0], new VecSet([]));
    }
    this._data.get(key[0])!.addArray(key.slice(1));
  }

  has(key: object | number[]): boolean {
    if (key instanceof Array) {
      return this.hasArray(key);
    } else {
      return this.hasObject(key);
    }
  }

  private hasObject(key: object) {
    return this.hasArray(flattenObject(key));
  }

  private hasArray(key: number[]): boolean {
    if (key.length == 0) {
      return this._is;
    }
    if (!this._data.has(key[0])) {
      return false;
    }
    return this._data.get(key[0])!.hasArray(key.slice(1));
  }

  delete(key: object | number[]) {
    if (key instanceof Array) {
      this.deleteArray(key);
    } else {
      this.deleteObject(key);
    }
  }

  private deleteObject(key: object) {
    this.deleteArray(flattenObject(key));
  }

  private deleteArray(key: number[]) {
    if (key.length == 1) {
      this._data.delete(key[0]);
      return;
    }
    if (!this._data.has(key[0])) {
      return;
    }
    this._data.get(key[0])!.deleteArray(key.slice(1));
  }

  getObjects(key: object, prototype: object): object[] {
    return this.getArrays(flattenObject(key)).forEach((element) => {});
  }

  getArrays(key: number[]): Array<number>[] {
    if (key.length == 0) {
      return this._data;
    }
    if (!this._data.has(key[0])) {
      return false;
    }
    return this._data.get(key[0])!.get(key.slice(1));
  }

  flatten() {
    let result = { is: this._is };

    for (let [key, value] of this._data.entries()) {
      if (value instanceof VecSet && value._data.size > 0) {
        result[key] = value.flatten();
      } else {
        result[key] = {};
      }
    }

    return result;
  }
}

type Point = {
  x: number;
  y: number;
};
const PointPrototype = {
  x: 0,
  y: 0,
};

type Line = {
  start: Point;
  end: Point;
};

const testObject = {
  start: {
    x: 0,
    y: 1,
  },
  end: {
    x: 2,
    y: 3,
  },
};
const testArray = [0, 5, 6, 7];

const vecSet = new VecSet([testObject]);

vecSet.add(testArray);

console.log(vecSet);

console.log(vecSet.has(testObject)); // true

console.log(vecSet.flatten());

//console.log(unflattenArray([4, 5, 6, 7], PointPrototype))
