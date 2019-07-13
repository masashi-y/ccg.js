
import { Category, isFunctor, isAtomic, isForwardFunctor, isBackwardFunctor, Functor, } from './cat'
import { Node, isNonTerminal } from './tree';

type Combinator = (left: Category, right: Category) => Category[]

// X/Y Y
let forwardApplication: Combinator = (left, right) => {
    if (isForwardFunctor(left) && left.right.matches(right)) {
        let result = left.modifier ? right : left.left
        return [Category.unify(result, left.right, right)]
    }
    return []
}

// X Y\X
let backwardApplication: Combinator = (left, right) => {
    if (isBackwardFunctor(right) && right.right.matches(left)) {
        let result = right.modifier ? left : right.left
        return [Category.unify(result, right.right, left)]
    }
    return []
}

// X/Y Y/Z --> X/Z
let forwardComposition: Combinator = (left, right) => {
    if (isForwardFunctor(left) && isForwardFunctor(right) && left.right.matches(right.left)) {
        let result = left.modifier ? right : Category.forward(left.left, right.right)
        return [Category.unify(result, left.right, right.left)]
    }
    return []
}

// X/Y Z\X --> Z/Y
let backwardComposition: Combinator = (left, right) => {
    if (isForwardFunctor(left) && isBackwardFunctor(right) && left.left.matches(right.right)) {
        let result = right.modifier ? left : Category.forward(right.left, left.right)
        return [Category.unify(result, left.left, right.right)]
    }
    return []
}

// X/Y (Y/Z)|W --> (X/Z)|W
let generalizedForwardComposition: Combinator = (left, right) => {
    if (isForwardFunctor(left) && isFunctor(right) && isForwardFunctor(right.left) && left.right.matches(right.left.left)) {
        let result = left.modifier ? right : Category.compose(left.left, right)
        return [Category.unify(result, left.right, right.left.left)]
    }
    return []
}

// (X\Y)|Z W\X --> (W\Y)|Z
let generalizedBackwardComposition: Combinator = (left, right) => {
    if (isBackwardFunctor(right) && isFunctor(left) && isBackwardFunctor(left.left) && left.left.left.matches(right.right)) {
        let result = right.modifier ? left : Category.compose(right.left, left)
        return [Category.unify(result, right.right, left.left.left)]
    }
    return []
}

// ((X\Y)|Z)|W U\X --> ((U\Y)|Z)|W
let generalizedBackwardComposition2: Combinator = (left, right) => {
    if (isBackwardFunctor(right) && isFunctor(left) && isFunctor(left.left) &&
            isBackwardFunctor(left.left.left) && left.left.left.left.matches(right.right)) {
        let result = right.modifier ? left : Category.compose(right.left, left)
        return [Category.unify(result, right.right, left.left.left.left)]
    }
    return []
}

// (((X\Y)|Z)|W)|U S\X --> (((S\Y)|Z)|W)|U
let generalizedBackwardComposition3: Combinator = (left, right) => {
    if (isBackwardFunctor(right) && isFunctor(left) && isFunctor(left.left) && isFunctor(left.left.left) &&
            isBackwardFunctor(left.left.left.left) && left.left.left.left.left.matches(right.right)) {
        let result = right.modifier ? left : Category.compose(right.left, left)
        return [Category.unify(result, right.right, left.left.left.left.left)]
    }
    return []

}

// X/Y Y\Z --> X\Z
let crossForwardComposition: Combinator = (left, right) => {
    if (isForwardFunctor(left) && isBackwardFunctor(right) && left.right.matches(right.left)) {
        let result = left.modifier ? right : Category.backward(left.left, right.right)
        return [Category.unify(result, left.right, right.left)]
    }
    return []
}

// X/Y (Y\Z)|W --> (X\Z)|W
let crossForwardComposition1: Combinator = (left, right) => {
    if (isForwardFunctor(left) && isFunctor(right) && isBackwardFunctor(right.left) && left.right.matches(right.left.left)) {
        let result = left.modifier ? right : Category.compose(left.left, right)
        return [Category.unify(result, left.right, right.left.left)]
    }
    return []
}

// X/Y ((Y\Z)|W)|U --> ((X\Z)|W)|U
let crossForwardComposition2: Combinator = (left, right) => {
    if (isForwardFunctor(left) && isFunctor(right) && isFunctor(right.left) &&
            isBackwardFunctor(right.left.left) && left.right.matches(right.left.left.left)) {
        let result = left.modifier ? right : Category.compose(left.left, right)
        return [Category.unify(result, left.right, right.left.left.left)]
    }
    return []
}
 
let Sdcl = Category.parse("S[dcl]")
let SemSem = Category.parse("S[em]\S[em]")
let englishBackwardApplication: Combinator = (left, right) => {
    if (left.matches(Sdcl) && right.matches(SemSem))
        return [Sdcl]
    return backwardApplication(left, right)
}

// , S[ng|pss]\NP --> (S\NP)\(S\NP)
let comma = Category.parse(",")
let vp = Category.parse("S[ng|pss]\\NP")
let adv = Category.parse("(S\\NP)\\(S\\NP)")
let commaVPtoADV: Combinator = (left, right) => {
    if (left.matches(comma) && right.matches(vp))
        return [adv]
    return []
}

// , S[dcl]/S[dcl] --> (S\NP)/(S\NP)
let auxiliary = Category.parse("S[dcl]/S[dcl]")
let adv2 = Category.parse("(S\\NP)/(S\\NP)")
let parentheticalDirectSpeech: Combinator = (left, right) => {
    if (left.matches(comma) && right.matches(auxiliary))
        return [adv2]
    return []
}

// PUNCT x --> x  or  x PUNCT --> x
let removePunctuation: Combinator = (left, right) => {
    if (isAtomic(left) && left.punct)
        return [right]
    if (isAtomic(right) && right.punct)
        return [left]
    return []
}

let conj = Category.parse("conj")
let NPNP = Category.parse("NP\\NP")
let conjunction: Combinator = (left, right) => {
    let puncts = [",", ";", "conj"]
    let result = []
    if (isAtomic(left) && puncts.indexOf(left.base) > -1 && ! right.punct)
        result.push(Category.backward(right, right))
    if (left.matches(conj) && right.matches(NPNP))
        result.push(Category.NP)
    return result
}

let conjoin: Combinator = (left, right) => {
    if (left.matches(right) && ! isFunctor(left))
        return [right]
    return []
}

export class Grammar {
    constructor(public rules: Combinator[]) {}

    check = (tree: Node): string[] => {
        let logs: string[] = []
        tree.each((node: Node) => {
            if (isNonTerminal(node)) {
                switch (node.children.length) {
                    case 1: break
                    case 2:
                        let [left, right] = node.children
                        let leftCat = Category.parse(left.cat)
                        let rightCat = Category.parse(right.cat)
                        let resultCat = Category.parse(node.cat)
                        if (! this.rules.some(rule => rule(leftCat, rightCat).some(cat => cat.matches(resultCat))))
                            logs.push(
                                `No rule combining ${left.cat} and ${right.cat} into ${node.cat}`)
                        break
                    default:
                        logs.push(`There is a node with more than two children`)
                }
            }
        })
        return logs
    }
}

export let EnglishGrammar = new Grammar([
    forwardApplication,
    englishBackwardApplication,
    forwardComposition,
    backwardComposition,
    generalizedForwardComposition,
    generalizedBackwardComposition,
    conjunction,
    removePunctuation,
    commaVPtoADV,
    parentheticalDirectSpeech
])

export let JapaneseGrammar = new Grammar([
    forwardApplication,
    backwardApplication,
    forwardComposition,
    backwardComposition,
    generalizedBackwardComposition,
    generalizedBackwardComposition2,
    generalizedBackwardComposition3,
    crossForwardComposition,
    crossForwardComposition1,
    crossForwardComposition2,
    conjoin
])