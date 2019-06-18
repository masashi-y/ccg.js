
import { Category, isFunctor, isAtomic, isForwardFunctor, isBackwardFunctor, } from './cat'
import { Node, isNonTerminal } from './tree';

type Combinator = (left: Category, right: Category) => boolean

// X/Y Y
let forwardApplication: Combinator = (left, right) => {
    return isForwardFunctor(left) && left.right.matches(right)
}

let backwardApplication: Combinator = (left, right) => {
    return isBackwardFunctor(right) && right.right.matches(left)
}

let forwardComposition: Combinator = (left, right) => {
    return isForwardFunctor(left) && 
            isForwardFunctor(right) &&
            left.right.matches(right.left)
}

let backwardComposition: Combinator = (left, right) => {
    return isForwardFunctor(left) &&
            isBackwardFunctor(right) &&
            left.left.matches(right.right)
}

// X/Y (Y/Z)|W --> (X/Z)|W
let generalizedForwardComposition: Combinator = (left, right) => {
    return isForwardFunctor(left) &&
            isFunctor(right) &&
            isForwardFunctor(right.left) &&
            left.right.matches(right.left.left)
}

// (X\Y)|Z W\X --> (W\Y)|Z
let generalizedBackwardComposition: Combinator = (left, right) => {
    return isBackwardFunctor(right) &&
            isFunctor(left) &&
            isBackwardFunctor(left.left) &&
            left.left.left.matches(right.right)
}

// ((X\Y)|Z)|W U\X --> ((U\Y)|Z)|W
let generalizedBackwardComposition2: Combinator = (left, right) => {
    return isBackwardFunctor(right) &&
            isFunctor(left) &&
            isFunctor(left.left) &&
            isBackwardFunctor(left.left.left) &&
            left.left.left.left.matches(right.right)
}

// (((X\Y)|Z)|W)|U S\X --> (((S\Y)|Z)|W)|U
let generalizedBackwardComposition3: Combinator = (left, right) => {
    return isBackwardFunctor(right) &&
            isFunctor(left) &&
            isFunctor(left.left) &&
            isFunctor(left.left.left) &&
            isBackwardFunctor(left.left.left.left) &&
            left.left.left.left.left.matches(right.right)
}

// X/Y Y\Z --> X\Z
let crossForwardComposition: Combinator = (left, right) => {
    return isForwardFunctor(left) &&
            isBackwardFunctor(right) &&
            left.right.matches(right.left)
}

// X/Y (Y\Z)|W --> (X\Z)|W
let crossForwardComposition1: Combinator = (left, right) => {
    return isForwardFunctor(left) &&
            isFunctor(right) &&
            isBackwardFunctor(right.left) &&
            left.right.matches(right.left.left)
}

// X/Y ((Y\Z)|W)|U --> ((X\Z)|W)|U
let crossForwardComposition2: Combinator = (left, right) => {
    return isForwardFunctor(left) &&
            isFunctor(right) &&
            isFunctor(right.left) &&
            isBackwardFunctor(right.left.left) &&
            left.right.matches(right.left.left.left)
}
 
let Sdcl = Category.parse("S[dcl]")
let SemSem = Category.parse("S[em]\S[em]")
let englishBackwardApplication: Combinator = (left, right) => {
    return isFunctor(right) && left.matches(Sdcl) && right.matches(SemSem) ||
            backwardApplication(left, right)
}

// , S[ng|pss]\NP --> (S\NP)\(S\NP)
let comma = Category.parse(",")
let adv = Category.parse("S[ng|pss]\\NP")
let commaVPtoADV: Combinator = (left, right) => {
    return left.matches(comma) && right.matches(adv)
}

// , S[dcl]/S[dcl] --> (S\NP)/(S\NP)
let auxiliary = Category.parse("S[dcl]/S[dcl]")
let parentheticalDirectSpeech: Combinator = (left, right) => {
    return left.matches(comma) && right.matches(auxiliary)
}

// PUNCT x --> x  or  x PUNCT --> x
let removePunctuation: Combinator = (left, right) => {
    return isAtomic(left) && left.punct || isAtomic(right) && right.punct
}

let conj = Category.parse("conj")
let NPNP = Category.parse("NP\\NP")
let conjunction: Combinator = (left, right) => {
    let puncts = [",", ";", "conj"]
    if (isAtomic(left) && puncts.indexOf(left.base) > -1 && ! right.punct)
        return true
    if (left.matches(conj) && right.matches(NPNP))
        return true
    return false
}

let conjoin: Combinator = (left, right) => {
    return left.matches(right) && isFunctor(left)
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
                        if (! this.rules.some(rule => rule(leftCat, rightCat)))
                            logs.push(
                                `There is no combinatory rule for ${left.cat} and ${right.cat}`)
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