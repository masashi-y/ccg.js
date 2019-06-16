export function assert(actual: any, expected: any): any {
    console.assert(actual === expected, `\nactual: ${actual}\nexpected: ${expected}`)
}

// https://qiita.com/nwtgck/items/bbfd6e3ca16857eb9c34
export type PartialMap<T> = {
    [P in keyof T]?: (prev: T[P]) => T[P]
}

export type Constructable<T> = new(...args: any[]) => T

export class Copyable<T> {
    constructor(private _constructor: Constructable<T>) {}

    copy(partial?: Partial<T>): T {
        const cloneObj: T = new this._constructor()
        return Object.assign(cloneObj, this, partial)
    }

    // mapCopy(partial: PartialMap<T>): T {
    //     const cloneObj: T = new this._constructor();
    //     for (const key of Object.keys(this)) {
    //         if (key in partial) {
    //             // @ts-ignore
    //             cloneObj[key] = (partial as any)[key](this[key]);
    //         } else {
    //             // @ts-ignore
    //             cloneObj[key] = this[key];
    //         }
    //     }
    //     return cloneObj;
    // }
}

declare global {
    interface Array<T> {
        equals(other: Array<T>): boolean
    }
}

if('equals' in Array.prototype)
    console.warn("Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code.");

Array.prototype.equals = function<T>(array: Array<T>) {
    if (!array)
        return false;

    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        if (this[i] != array[i]) { 
            return false;   
        }           
    }       
    return true;
}

Object.defineProperty(Array.prototype, "equals", {enumerable: false});