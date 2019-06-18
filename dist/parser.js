"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("./utils");
exports.test = "(<T S[dcl] 0 2>" +
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
    "                            (<L N XX XX Monday N>)" +
    "                        )" +
    "                    )" +
    "                )" +
    "            )" +
    "        ) " +
    "    )" +
    "    (<L . XX XX . .>)" +
    " )";
var NodeBase = /** @class */ (function () {
    function NodeBase() {
        this.orig = undefined;
        this.width = 0;
    }
    return NodeBase;
}());
exports.NodeBase = NodeBase;
var NonTerminal = /** @class */ (function (_super) {
    __extends(NonTerminal, _super);
    function NonTerminal(cat, left_is_head, children) {
        var _this = _super.call(this) || this;
        _this.cat = cat;
        _this.left_is_head = left_is_head;
        _this.children = children;
        return _this;
    }
    NonTerminal.prototype.each = function (f) {
        f(this);
        this.children.forEach(function (node) { return node.each(f); });
    };
    NonTerminal.prototype.contains = function (target) {
        function rec(node) {
            if (isNonTerminal(node)) {
                if (node === target)
                    return true;
                else
                    return node.children.some(rec);
            }
            else
                return false;
        }
        return this.children.some(rec);
    };
    return NonTerminal;
}(NodeBase));
exports.NonTerminal = NonTerminal;
var Terminal = /** @class */ (function (_super) {
    __extends(Terminal, _super);
    function Terminal(cat, tag1, tag2, word) {
        var _this = _super.call(this) || this;
        _this.cat = cat;
        _this.tag1 = tag1;
        _this.tag2 = tag2;
        _this.word = word;
        return _this;
    }
    Terminal.prototype.each = function (f) {
        f(this);
    };
    Terminal.prototype.contains = function (_) {
        return false;
    };
    return Terminal;
}(NodeBase));
exports.Terminal = Terminal;
function isTerminal(x) {
    return x instanceof Terminal;
}
exports.isTerminal = isTerminal;
function isNonTerminal(x) {
    return x instanceof NonTerminal;
}
exports.isNonTerminal = isNonTerminal;
// export type Node = Terminal | NonTerminal
var Tree = /** @class */ (function () {
    function Tree(root, index) {
        if (index === void 0) { index = 0; }
        this.root = root;
        this.index = index;
    }
    Tree.prototype.valid = function () {
        var valid = true;
        this.root.each(function (node) {
            if (isNonTerminal(node)) {
                valid = valid && node.children.length <= 2;
            }
        });
        return valid;
    };
    Tree.prototype.nodes = function () {
        var res = [];
        this.root.each(function (node) {
            res.push(node);
        });
        return res;
    };
    return Tree;
}());
exports.Tree = Tree;
var AUTO;
(function (AUTO) {
    function stringify(tree) {
        function rec(node) {
            if (isTerminal(node)) {
                return "(<L " + node.cat + " " + node.tag1 + " " + node.tag2 + " " + node.word + " " + node.cat + ">)";
            }
            else if (isNonTerminal(node)) {
                var children_str = node.children.map(rec).join(' ');
                var left_is_head = node.left_is_head ? '0' : '1';
                return "(<T " + node.cat + " " + left_is_head + " " + node.children.length + "> " + children_str + " )";
            }
            else {
                throw Error();
            }
        }
        return rec(tree.root);
    }
    AUTO.stringify = stringify;
    function parse(line) {
        var index = 0;
        var items = line.split(/[ ]+/);
        function parse() {
            if (items[index] == '(<L')
                return parseTerminal();
            else if (items[index] == '(<T')
                return parseNonTerminal();
            else
                throw Error("invalid parse item " + items[index] + " at index " + index + " in " + items);
        }
        function parseTerminal() {
            utils_1.Utils.assert(items[index++], '(<L');
            var cat = items[index++];
            var tag1 = items[index++];
            var tag2 = items[index++];
            var word = items[index++];
            index++;
            return new Terminal(cat, tag1, tag2, word);
        }
        function parseNonTerminal() {
            utils_1.Utils.assert(items[index++], '(<T');
            var cat = items[index++];
            var left_is_head = items[index++] == '0';
            var children = [];
            index++;
            while (items[index] != ')')
                children.push(parse());
            utils_1.Utils.assert(items[index++], ')');
            return new NonTerminal(cat, left_is_head, children);
        }
        return new Tree(parse());
    }
    AUTO.parse = parse;
})(AUTO = exports.AUTO || (exports.AUTO = {}));
console.log(AUTO.stringify(AUTO.parse(exports.test)));
