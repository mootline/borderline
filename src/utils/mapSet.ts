export class MapSet {
	private _data: Map<string, SerializedSet>

	constructor(data?: Map<string, SerializedSet>) {
		this._data = data || new Map()
	}

	add(key: any, value: any) {
		key = JSON.stringify(key)
		if (!this._data[key]) {
			this._data[key] = new SerializedSet()
		}
		this._data[key].add(value)
	}

	delete(key: any, value: any) {
		key = JSON.stringify(key)
		if (this._data[key]) {
			this._data[key].delete(value)
		}
	}

	get(key: any) {
		key = JSON.stringify(key)
		return this._data[key] ? this._data[key].values() : []
	}

	keys() {
		return Array.from(Object.keys(this._data)).map((key) => JSON.parse(key))
	}
	/*
  minKey() {
    return this.keys().map((key) => this.min(key));
  }
  
  maxKey() {
    return this.keys().map((key) => this.max(key));
  }
  
  minVal(key: any) {
    return this.get(key).reduce((min, current) => min < current ? min : current);
  }
  
  maxVal(key: any) {
    return this.get(key).reduce((max, current) => max > current ? max : current);
  }
  */
	has(key: any, value: any) {
		return this._data[JSON.stringify(key)]?.has(value)
	}
}

export class SerializedSet {
	private _data: Set<any>

	constructor(data?: any) {
		this._data =
			new Set(Array.from(data || []).map((value) => JSON.stringify(value))) ||
			new Set()
	}

	add(value: any) {
		this._data.add(JSON.stringify(value))
	}

	delete(value: any) {
		this._data.delete(JSON.stringify(value))
	}

	has(value: any) {
		return this._data.has(JSON.stringify(value))
	}

	values() {
		return Array.from(this._data).map((value) => JSON.parse(value))
	}
}
