/*global console*/
if (typeof lex === 'undefined') {
    var lex = {};
}

(function () {
    "use strict";

    /**
     *
     * @author Dmitry Balabka <dmitry.balabka@gmail.com>
     * @class lex.Grammar
     */
    var parser = lex.Grammar = function () {

        /**
         * Next token
         * @type {{cls:{String},symbol:{String},index:{Number}}}
         */
        this.ns = null;

        /**
         * All tokens
         * @type {Array}
         */
        this.tokes = [];

        /**
         *
         */
        this.parser = new lex.Parser();

    };

    /**
     * @param {String} source
     */
    parser.prototype.analyze = function (source) {
        this.parser.parse(source);
        this.tokens = this.parser.getTokens();
        this.scan();
        this.state();
    };

    parser.prototype.scan = function () {
        this.ns = this.tokens.shift() || {
            cls: 0, symbol: '', index: -1
        };
    };

    /**
     *
     */
    parser.prototype.state = function () {
        if (this.ns.symbol.toLowerCase() === 'if') {
            this.scan();
            this.expression();
        } else {
            this.error('Expected `if` but got ' + this.ns.symbol);
        }

        //this.scan();
        if (this.ns.symbol.toLowerCase() === 'then') {
            this.scan();
            this.expression();
        } else {
            this.error('Expected `then` but got ' + this.ns.symbol);
        }
    };

    parser.prototype.expression = function () {
        this.simpleExpression();
        if (this.ns.symbol.toLowerCase() === '>') {
            this.scan();
            this.simpleExpression();
        }
    };

    parser.prototype.simpleExpression = function () {
        this.term();
        while (this.ns.symbol.toLowerCase() === '+') {
            this.scan();
            this.term();
        }
    };

    parser.prototype.term = function () {
        this.factor();
    };

    parser.prototype.factor = function () {
        if (this.ns.cls !== lex.Parser.prototype.CLASS_STR && this.ns.cls !== lex.Parser.prototype.CLASS_INT) {
            this.variable();
        } else {
            this.scan();
        }
    };

    parser.prototype.variable = function () {
        if (this.ns.cls !== lex.Parser.prototype.CLASS_ID) {
            this.error('Identifier expected but got ' + this.parser.getClassName(this.ns.cls));
        }
        this.scan();
        if (this.ns.symbol === '(') {
            this.scan();
            this.expression();
            if (this.ns.symbol !== ')') {
                this.error('Expected closing `)`, but got ' + this.ns.symbol);
            }
            this.scan();
        }
    };

    parser.prototype.error = function (msg) {
        console.log(msg);
    };

    /**
     * @returns {lex.Parser}
     */
    parser.prototype.getParser = function () {
        return this.parser;
    };

})();
