"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Utils;
(function (Utils) {
    function assert(actual, expected) {
        console.assert(actual === expected, "\nactual: " + actual + "\nexpected: " + expected);
    }
    Utils.assert = assert;
    var Copyable = /** @class */ (function () {
        function Copyable(_constructor) {
            this._constructor = _constructor;
        }
        Copyable.prototype.copy = function (partial) {
            var cloneObj = new this._constructor();
            // @ts-ignore
            return Object.assign(cloneObj, this, partial);
        };
        Copyable.prototype.mapCopy = function (partial) {
            var cloneObj = new this._constructor();
            for (var _i = 0, _a = Object.keys(this); _i < _a.length; _i++) {
                var key = _a[_i];
                if (key in partial) {
                    // @ts-ignore
                    cloneObj[key] = partial[key](this[key]);
                }
                else {
                    // @ts-ignore
                    cloneObj[key] = this[key];
                }
            }
            return cloneObj;
        };
        return Copyable;
    }());
})(Utils = exports.Utils || (exports.Utils = {}));
