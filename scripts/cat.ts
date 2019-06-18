import { schemeCategory10 } from "d3";


export type Category = Atomic | Functor

export class Feature {
    constructor(public string: string) {}

    get empty(): boolean {
        return this.string == ""
    }

    matches(other: Feature): boolean {
        return this.empty ||
                other.empty ||
                this.string == "nb" ||
                other.string == "nb" ||
                this.string == other.string
    }
}

let emptyFeature = new Feature("")

export class Atomic {
    feature: Feature
    constructor(public base: string,
                feature: Feature | string = "") {
                    if (typeof feature === "string")
                        this.feature = new Feature(feature)
                    else
                        this.feature = feature
                }

    get string() {
        if (this.feature.empty)
            return this.base
        else
            return `${this.base}[${this.feature.string}]`
    }

    matches(other: Category): boolean {
        if (isAtomic(other)) {
            return this.base == other.base &&
                this.feature.matches(other.feature)
        } else {
            return false
        }
    }

    get punct(): boolean {
        return !this.base.match(/^[a-zA-Z]+$/) ||
                this.base == "LRB" ||
                this.base == "RRB" ||
                this.base == "LQU" ||
                this.base == "RQU"
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

    matches(other: Category): boolean {
        if (isFunctor(other)) {
               return this.left.matches(other.left) &&
                       this.right.matches(other.right) &&
                       this.slash == other.slash
        } else {
            return false
        }
    }

    get punct(): boolean {
        return false
    }
    // isForward(): this is Functor {
    //     return true
    // }
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
    throw Error(`Mismatched brackets in string: ${source}`)
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

export module Category {
    export let S = new Atomic("S")
    export let N = new Atomic("N")
    export let NP = new Atomic("NP")
    export let S_ = (feature: string) => new Atomic("S", feature)
    export let N_ = (feature: string) => new Atomic("N", feature)
    export let NP_ = (feature: string) => new Atomic("NP", feature)
    export let fwd = (x: Category, y: Category) => new Functor(x, "/", y)
    export let bwd = (x: Category, y: Category) => new Functor(x, "\\", y)

    export function parse(cat: string): Category {
        cat = dropBrackets(cat)
        let slash_index = findNonNestedSlash(cat)
        if (!slash_index) {
            let feature_index = cat.lastIndexOf("[")
            if (feature_index > -1) {
                let base = cat.slice(0, feature_index)
                let feature = cat.slice(feature_index + 1, cat.length - 1)
                return new Atomic(base, feature)
            } else {
                return new Atomic(cat)
            }
        } else {
            let left = parse(cat.slice(0, slash_index))
            let slash = cat[slash_index]
            let right = parse(cat.slice(slash_index + 1))
            return new Functor(left, slash, right)
        }
    }
}
