
var test = "(<T S[dcl] 0 2>" +
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
" )";

function assert(actual, expected) {
    console.assert(actual === expected,
        `\nactual: ${actual}\nexpected: ${expected}`);
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

var inherits = function(childCtor, parentCtor) {
    Object.setPrototypeOf(childCtor.prototype, parentCtor.prototype);
};

var Node = function() {
    this.id = -1;
    this.parentId = -1;
    this.status = "unchanged";
    this.orig = null;
}

Node.prototype.copy = function(node=null) {
    if (!node)
        node = new Node();
    node.id = this.id;
    node.parentId = this.parentId;
    node.status = clone(this.status);
    node.orig = clone(this.orig);
    return node;
}

// Node.prototype.getParent = function(ccgTree) {
//     for (cand of ccgTree.nodes)
//         if (cand.children && cand.children.map(node => node.id).includes(this.id))
//             return cand;
//     throw new Error("not found parent node");
// }

var Terminal = function(cat, tag1, tag2, word, dep) {
    this.cat = cat;
    this.tag1 = tag1;
    this.tag2 = tag2;
    this.word = word;
    this.dep = dep;
    Node.call(this);
}

inherits(Terminal, Node);

Terminal.prototype.each = function(f) { f(this); }

Terminal.prototype.copy = function() {
    let node = new Terminal(
        this.cat, this.tag1, this.tag2, this.word, this.dep);
    return Node.prototype.copy.call(this, node);
}

Terminal.prototype.contains = function() { return false };

var NonTerminal = function(cat, left_is_head, children) {
    this.cat = cat;
    this.left_is_head = left_is_head;
    this.children = children;
    Node.call(this);
}

inherits(NonTerminal, Node);

NonTerminal.prototype.each = function(f) {
     f(this); this.children.forEach(node => node.each(f)); 
}


NonTerminal.prototype.copy = function() {
    let node = new NonTerminal(
        this.cat, this.left_is_head, this.children.map(node => node.copy()));
    return Node.prototype.copy.call(this, node);
}

NonTerminal.prototype.contains = function(target) {
    function rec(node) {
        if (node instanceof NonTerminal) {
            if (node === target) return true;
            else return node.children.some(rec);
        }
    }
    return this.children.some(rec);
};

var CCGTree = function(root, update=true) {
    this.root = root;
    this.id = 0;
    if (update) {
        root.each(node => {
            node.id = this.id++;
            // this.nodes.push(node);
            if (node.children)
                for (child of node.children)
                    child.parentId = node.id;
        });
        root.each(node => {
            node.orig = clone(node);
        });
    }
}

CCGTree.prototype.each = function(f) {
    this.root.each(f);
}

CCGTree.prototype.add = function(node, parent) {
    node.id = this.id++;
    node.parentId = parent.id;
    node.status = "edited";
    node.orig = null;
    node.orig = clone(node);
}

CCGTree.prototype.copy = function() {
    let tree = new CCGTree(this.root.copy(), false);
    tree.id = this.id;
    return tree;
}

CCGTree.prototype.isValid = function() {
    let valid = true;
    this.root.each(node => {
        if (node.children) {
            valid &= node.children.length <= 2;
        }
        // TODO: check the validity of category structure as well.
    });
    return valid;
}

var AUTO = function() {};

AUTO.parse = function(line) {
    let index = 0;
    let items = line.split(/[ ]+/);

    function parse() {
        if (items[index] == '(<L')
            return parseTerminal();
        else if (items[index] == '(<T')
            return parseNonTerminal();
        else
            console.warn(
                `invalid parse item ${items[index]} at index ${index} in ${items}`);
    }

    function parseTerminal() {
        assert(items[index++], '(<L');
        return new Terminal(
            items[index++],
            items[index++],
            items[index++],
            items[index++],
            items[index++].slice(0, -2)
        );
    }

    function parseNonTerminal() {
        assert(items[index++], '(<T');
        let res = new NonTerminal(
            items[index++],
            items[index++] == '0',
            []
        );
        let numChildren = items[index++].slice(0, -1);
        while (items[index] != ')')
            res.children.push(parse());
        assert(items[index++], ')');
        return res;
    }
    return new CCGTree(parse());
}

AUTO.stringify = function(tree) {
    function rec(node) {
        if (!node.children) {
            return `(<L ${node.cat} ${node.tag1} ${node.tag2} ${node.word} ${node.dep}>)`;
        } else {
            let children_str = node.children.map(rec).join(" "),
                left_is_head = node.left_is_head ? '0' : '1';
            return `(<T ${node.cat} ${left_is_head} ${node.children.length}> ${children_str} )`;
        }
    }
    return rec(tree.root);
}

console.log(AUTO.stringify(AUTO.parse(test)));