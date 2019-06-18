
import * as Utils from './utils';
import { Grammar, EnglishGrammar } from './grammar';

export let test = "(<T S[dcl] 0 2>" +
"     (<T S[dcl] 0 2>" +
"         (<L S/S XX XX No S/S>)" +
"         (<T S[dcl] 0 2>" +
"            (<L , XX XX , ,>)" +
"            (<T S[dcl] 0 2>" +
"                (<L NP XX XX it NP>)" +
"                (<T S[dcl]\\NP 0 2>" +
"                    (<T (S[dcl]\\NP)/NP 0 2>" +
"                        (<L (S[dcl]\\NP)/NP XX XX was (S[dcl]\\NP)/NP>)" +
"                        (<L (S\\NP)\(S\\NP) XX XX n't (S\\NP)\(S\\NP)>)" +
"                    )" +
"                    (<T NP 0 1>" +
"                        (<T N 0 2>" +
"                            (<L N/N XX XX Black N/N>)" +
"                            (<L N XX XX Monday N>)" +
"                        )" +
"                    )" +
"                )" +
"            )" +
"        ) " +
"    )" +
"    (<L . XX XX . .>)" +
" )"

export class InvalidEditError implements Error {
    public name = 'InvalidEditError'
    constructor(public message: string) { }
  
    toString() {
      return this.name + ': ' + this.message;
    }
}

type Category = string;

export type status = "normal" | "selected"

let realizationOrder = (a: Node, b: Node) =>
        a.leftMostChild().index < b.leftMostChild().index ? -1 : 1

export class Node {
    width: number
    status: string
    private constructor(public cat: Category,
                public children: Node[],
                public tag1?: string,
                public tag2?: string,
                public word?: string,
                public index?: number) {
        this.width = 0
        this.status = "normal"
    }

    static terminal(cat: Category, tag1: string, tag2: string, word: string, index: number): Node {
        return new Node(cat, [], tag1, tag2, word, index)
    }

    static nonterminal(cat: Category, children: Node[]): Node {
        return new Node(cat, children)
    }

    // turn this node into nonterminal node
    raise(): void {
        this.tag1 = this.tag2 = this.word = this.index = undefined
    }

    each(f: (node: Node) => void): void {
        f(this)
        this.children.forEach(node => node.each(f))
    }

    removeChild(...nodes: Node[]): void {
        this.children = this.children.filter(child =>
            nodes.every(node => child !== node)
        )
    }

    pushChild(...nodes: Node[]): void {
        Array.prototype.push.apply(this.children, nodes)
    }

    attachChildren(...children: Node[]): void {
        let prevNode = this.deepcopy()
        this.removeChild(...children)
        this.pushChild(...children)
        this.children.sort(realizationOrder)
    }

    get leaves(): Terminal[] {
        let res: Terminal[] = []
        this.each((node: Node) => {
            if (isTerminal(node))
                res.push(node)
        })
        return res
    }

    leftMostChild(): Terminal {
        function rec(node: Node): Terminal {
            if (isTerminal(node))
                return node
            else if (isNonTerminal(node))
                return rec(node.children[0])
            else
                throw Error()
        } 
        return rec(this)
    }

    contains(target: Node): boolean {
        return this === target || this.children.some(node => node == target)
    }

    // contains(target: Node): boolean {
    //     function rec(node: Node): boolean {
    //         if (isNonTerminal(node)) {
    //             if (node === target)
    //                 return true
    //             else
    //                 return node.children.some(rec)
    //         } else
    //             return false
    //     }
    //     return this.children.some(rec)
    // }

    deepcopy(): Node {
        let children = this.children.map(d => d.deepcopy())
        let newNode = new Node(this.cat,
                               children,
                               this.tag1,
                               this.tag2,
                               this.word,
                               this.index)
        newNode.width = this.width
        newNode.status = this.status
        return newNode
    }

}

export interface Terminal {
    cat: Category,
    tag1: string,
    tag2: string,
    word: string,
    index: number
}

export interface NonTerminal {
    cat: Category,
    children: Node[]
}

export function isTerminal(x: any): x is Terminal {
    return x.children.length == 0
}

export function isNonTerminal(x: any): x is NonTerminal {
    return ! isTerminal(x)
}

export class Tree {
    constructor(public root: Node,
                public index: number = 0) {}

    check(): string[] {
        let logs = EnglishGrammar.check(this.root)
        return logs
        // let valid = true
        // this.root.each(node => {
        //     if (isNonTerminal(node)) {
        //         valid = valid && node.children.length <= 2
        //     }
        // })
        // return valid
    }

    nodes(): Array<Node> {
        let res: Node[] = []
        this.root.each(node => {
            res.push(node)
        })
        return res
    }
}

export namespace AUTO {
    export function stringify(tree: Tree): string {
        function rec(node: Node): string {
            if (isTerminal(node)) {
                return `(<L ${node.cat} ${node.tag1} ${node.tag2} ${node.word} ${node.cat}>)`
            } else if (isNonTerminal(node)) {
                let children_str = node.children.map(rec).join(' ')
                return `(<T ${node.cat} 0 ${node.children.length}> ${children_str} )`
            } else {
                throw Error()
            }
        }
        return rec(tree.root);
    }

    export function parse(line: string): Tree {
        let index: number = 0
        let leafIndex: number = 0
        let items: string[] = line.split(/[ ]+/)

        function parse(): Node {
            if (items[index] == '(<L')
                return parseTerminal()
            else if (items[index] == '(<T')
                return parseNonTerminal()
            else
                throw Error(
                    `invalid parse item ${items[index]} at index ${index} in ${items}`)
        }

        function parseTerminal(): Node {
            Utils.assert(items[index++], '(<L')
            let cat = items[index++]
            let tag1 = items[index++]
            let tag2 = items[index++]
            let word = items[index++]
            index++
            return Node.terminal(cat, tag1, tag2, word, leafIndex++)
        }

        function parseNonTerminal(): Node {
            Utils.assert(items[index++], '(<T')
            let cat = items[index++]
            let left_is_head = items[index++] == '0'
            let children: Node[] = []
            index++
            while (items[index] != ')')
                children.push(parse());
            Utils.assert(items[index++], ')')
            return Node.nonterminal(cat, children)
        }
        return new Tree(parse());
    }
}


console.log(AUTO.stringify(AUTO.parse(test)));
let tree = AUTO.parse(test)
console.log(isTerminal(tree.root))
