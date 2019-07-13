

export type Category = Atomic | Functor

export type Feature = SingleValuedFeature | MultiValuedFeature

type KeyValuePair = [string, string]

function isKeyValuePair(x: any): x is KeyValuePair {
    return x instanceof Array &&
            x.length == 2 &&
            x.every(value => typeof value == "string")
}

export class SingleValuedFeature {
    constructor(public string: string) {}

    get empty(): boolean {
        return this.string == ""
    }

    get variable(): boolean { return this.string == "X" }

    matches(other: Feature): boolean {
        if (other instanceof SingleValuedFeature)
            return this.empty ||
                other.empty ||
                this.variable ||
                other.variable ||
                this.string == "nb" ||
                other.string == "nb" ||
                this.string == other.string
        else
            return false
    }

    equals(other: Feature): boolean {
        return other instanceof SingleValuedFeature &&
                this.string == other.string
    }

    unify(other: Feature): SingleValuedFeature | null {
        if (other instanceof SingleValuedFeature) {
            if (this.empty || this.variable || this.string == "nb")
                return other
            else if (other.empty || other.variable || other.string == "nb")
                return this
            else if (this.string == other.string)
                return this
            else
                return null
        }
        return null
    }
}

export class MultiValuedFeature {
    constructor(public items: KeyValuePair[]) {}

    get empty(): boolean {
        return this.items.length == 0
    }

    matches(other: Feature): boolean {
        return other instanceof MultiValuedFeature &&
            this.items.length != other.items.length &&
            this.items.every((item, index) =>
                item[0] == other.items[index][0] &&
                item[index][1].match(/^X\d+$/) ||
                other.items[index][1].match(/^X\d+$/) ||
                item[1] == other.items[index][1])
    }

    equals(other: Feature): boolean {
        return other instanceof MultiValuedFeature &&
            this.items.length == other.items.length &&
            this.items.every((item, index) =>
                item[0] == other.items[index][0] &&
                item[1] == other.items[index][1])
    }

    get string() {
        return this.items.map(item => {
            let [name, value] = item
            return `${name}=${value}`
        }).join(",")
    }

    toString = () => this.string

    get variable(): boolean {
        return this.items.some(
            ([_, value]: KeyValuePair) => value.match(/^X\d+$/))
    }

    unify(other: Feature): MultiValuedFeature | null {
        function unifyKeyValue([key1, value1]: KeyValuePair,
                               [key2, value2]: KeyValuePair): KeyValuePair | null {
            if (key1 != key2)
                return null
            else if (value1.match(/^X\d+$/))
                return [key2, value2]
            else if (value2.match(/^X\d+$/))
                return [key1, value1]
            else if (value1 == value2)
                return [key1, value1]
            else
                return null
        }
        if (other instanceof MultiValuedFeature) {
            let key_value_pair = []
            for (let i = 0; i < this.items.length; i++) {
                let unified = unifyKeyValue(this.items[i], other.items[i])
                if (unified)
                    key_value_pair.push(unified)
                else
                    return null
            }
            return new MultiValuedFeature(key_value_pair)
        } else {
            return null
        }
    }
}


export class Atomic {
    feature: Feature
    constructor(public base: string, feature: Feature | string = "") {
        if (typeof feature === "string")
            this.feature = new SingleValuedFeature(feature)
        else
            this.feature = feature
    }

    get string() {
        if (this.feature.empty)
            return this.base
        else
            return `${this.base}[${this.feature.string}]`
    }

    toString = () => this.string

    get modifier() { return false }

    matches(other: Category): boolean {
        if (isAtomic(other)) {
            return this.base == other.base &&
                this.feature.matches(other.feature)
        } else {
            return false
        }
    }

    equals(other: Category): boolean {
        return isAtomic(other) &&
             this.base == other.base &&
             this.feature.equals(other.feature)
    }

    get punct(): boolean {
        return !this.base.match(/^[a-zA-Z]+$/) ||
                this.base == "LRB" ||
                this.base == "RRB" ||
                this.base == "LQU" ||
                this.base == "RQU"
    }

    unification(other: Category): Feature | null {
        if (other instanceof Atomic && this.base == other.base) {
            return this.feature.unify(other.feature)
        }
        return null
    }

    insert(feature: Feature): Atomic {
        return new Atomic(this.base, this.feature.variable ? feature : this.feature)
    }
}

export class Functor {
    constructor(public left: Category,
                public slash: string,
                public right: Category) {}

    get string() {
        let rec = (cat: Category): string => {
            if (cat instanceof Atomic)
                return cat.string
            else
                return `(${rec(cat.left)}${cat.slash}${rec(cat.right)})`
        }
        let result = rec(this)
        return result.slice(1, result.length - 1)
    }

    toString = () => this.string

    get modifier() { return this.left.equals(this.right) }

    matches(other: Category): boolean {
        return isFunctor(other) &&
            this.left.matches(other.left) &&
            this.right.matches(other.right) &&
            this.slash == other.slash
    }

    equals(other: Category): boolean {
        return isFunctor(other) &&
            this.left.equals(other.left) &&
            this.right.equals(other.right) &&
            this.slash == other.slash
    }

    get punct(): boolean {
        return false
    }

    unification(other: Category): Feature | null {
        if (other instanceof Functor && this.slash == other.slash) {
            let left = this.left.unification(other.left)
            let right = this.left.unification(other.right)
            if (left)
                return left
            if (right)
                return right
        }
        return null
    }

    insert(feature: Feature): Functor {
        return new Functor(this.left.insert(feature),
                           this.slash,
                           this.right.insert(feature))
    }
}

export function isAtomic(x: Category): x is Atomic {
    return x instanceof Atomic
}

export function isFunctor(x: Category): x is Functor {
    return x instanceof Functor
}

export function isForwardFunctor(x: Category): x is Functor {
    return isFunctor(x) && x.slash == "/"
}

export function isBackwardFunctor(x: Category): x is Functor {
    return isFunctor(x) && x.slash == "\\"
}

function dropBrackets(cat: string): string {
    if (cat.startsWith("(") && cat.endsWith(")") &&
        findClosingBracket(cat) == cat.length - 1) {
        return cat.slice(1, cat.length - 1)
    } else {
        return cat
    }
}

function findClosingBracket(source: string): number {
    let open_brackets = 0
    for (let i = 0; i < source.length; i++) {
        const char = source[i];
        if (char == '(')
            open_brackets += 1
        if (char == ')')
            open_brackets -= 1
        if (open_brackets == 0)
            return i
    }
    throw new CategoryParseError(`Mismatched brackets in string: ${source}`)
}

function findNonNestedSlash(cat: string): number | null {
    let open_brackets = 0
    for (let i = 0; i < cat.length; i++) {
        const char = cat[i]
        if (char == '(')
            open_brackets += 1
        if (char == ')')
            open_brackets -= 1
        if (open_brackets == 0 && (char == "/" || char == "\\"))
            return i
    }
    return null
}

export class CategoryParseError implements Error {
    public name = 'CategoryParseError'
    constructor(public message: string) {}
  
    toString() { return this.name + ': ' + this.message }
}

export module Category {
    export let S = new Atomic("S")
    export let N = new Atomic("N")
    export let NP = new Atomic("NP")
    export let S_ = (feature: string) => new Atomic("S", feature)
    export let N_ = (feature: string) => new Atomic("N", feature)
    export let NP_ = (feature: string) => new Atomic("NP", feature)
    export let forward = (x: Category, y: Category) => new Functor(x, "/", y)
    export let backward = (x: Category, y: Category) => new Functor(x, "\\", y)

    export function unify(c: Category, a: Category, b: Category): Category {
        let feature = a.unification(b)
        return feature ? c.insert(feature) : c
    }


    // used in backward/forward composition
    // result_category: U, functor: ((X\Y)|Z)|W --> ((U\Y)|Z)|W
    export let compose = (result_category: Category, functor: Functor): Category => {
        let rec = (cat: Category, left: boolean): Category => {
            if (isFunctor(cat))
                return new Functor(rec(cat.left, true),
                                cat.slash,
                                rec(cat.right, false))
            return left ? result_category : cat
        }
        return rec(functor, false)
    }

    export function parse(orig_cat: string): Category {
        function parseFeature(feature: string): Feature {
            let feature_values = feature.split(",")
            if (feature_values.length == 1) {
                return new SingleValuedFeature(feature_values[0])
            } else {
                let key_value_pairs = feature_values.map(feature => {
                    let key_value = feature.split("=")
                    if (isKeyValuePair(key_value))
                        return key_value
                    else
                        throw new CategoryParseError(
                            `invalid multi value feature ${orig_cat}`)
                })
                return new MultiValuedFeature(key_value_pairs)
            }
        }

        function parseCat(cat: string): Category {
            cat = dropBrackets(cat)
            let slash_index = findNonNestedSlash(cat)
            if (!slash_index) {
                let feature_index = cat.lastIndexOf("[")
                if (feature_index > -1) {
                    let base = cat.slice(0, feature_index)
                    let feature = parseFeature(cat.slice(feature_index + 1, cat.length - 1))
                    return new Atomic(base, feature)
                } else {
                    return new Atomic(cat)
                }
            } else {
                let left = parseCat(cat.slice(0, slash_index))
                let slash = cat[slash_index]
                let right = parseCat(cat.slice(slash_index + 1))
                return new Functor(left, slash, right)
            }
        }
        return parseCat(orig_cat)
    }
}
