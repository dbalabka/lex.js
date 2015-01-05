/*global console*/
if (typeof lex === 'undefined') {
    var lex = {};
}

(function () {
    "use strict";

    /**
     *
     * @author Dmitry Balabka <dmitry.balabka@gmail.com>
     * @class lex.Parser
     */
    var parser = lex.Parser = function () {

        /**
         * Index of current scanning index
         * @type {number}
         */
        this.i = 0;

        /**
         * Current processing char container
         * @type {String}
         */
        this.char = ' ';

        /**
         * Keeps current processing lexeme string
         * @type {string}
         */
        this.a = '';

        /**
         * Current processing identifier ID from keywords or special characters table.
         * 0 if current identifier is not a keyword or special characters.
         * @type {number|null}
         */
        this.j = null;

        /**
         * Programme source
         * @type {String}
         */
        this.source = null;

        /**
         * Backuped state before parsing iteration
         * @type {{i: {Number}, char: {String}}}
         */
        this.state = {
            i: null,
            char: null
        };

        /**
         * Char types
         * @type {{digit: {regexp: RegExp}, letter: {regexp: RegExp}, delim: {regexp: RegExp}, quote: {regexp: RegExp}, not quote: {regexp: RegExp}, whitespace: {regexp: RegExp}}}
         */
        this.charTypes = {
            'digit': {regexp: /^[0-9]$/},
            'letter': {regexp: /^\w$/},
            'delim': {regexp: /^[+\-\(\)\[\]=;:<>,]$/},
            'quote': {regexp: /^'$/},
            'not quote': {regexp: /^[^']$/},
            'whitespace': {regexp: /^\s$/}
        };

        /**
         * All reserved symbols table
         * @type {Array}
         */
        this.terminalTable = [
            {index: 1, value: 'procedure', delim: false},
            {index: 2, value: '(', delim: true},
            {index: 3, value: ')', delim: true},
            {index: 4, value: ':', delim: true},
            {index: 5, value: ';', delim: true},
            {index: 6, value: 'var', delim: false},
            {index: 7, value: '[', delim: true},
            {index: 8, value: ']', delim: true},
            {index: 9, value: 'begin', delim: false},
            {index: 10, value: ',', delim: true},
            {index: 11, value: 'if', delim: false},
            {index: 12, value: 'then', delim: false},
            {index: 13, value: 'else', delim: false},
            {index: 13, value: ':=', delim: true},
            {index: 14, value: '>', delim: true},
            {index: 15, value: '<', delim: true},
            {index: 16, value: '<>', delim: true},
            {index: 17, value: 'end', delim: false},
            {index: 18, value: 'real', delim: false},
            {index: 19, value: 'string', delim: false},
            {index: 20, value: 'do', delim: false},
            {index: 21, value: '=', delim: true},
            {index: 22, value: '+', delim: true}
        ];

        /**
         * All non reserved symbols table
         * @type {Array}
         */
        this.nonTerminalTable = {};
        this.nonTerminalTable[this.CLASS_INT] = [];
        this.nonTerminalTable[this.CLASS_STR] = [];
        this.nonTerminalTable[this.CLASS_ID] = [];
        this.nonTerminalTable[this.CLASS_DELIM] = [];

        /**
         * Class names
         *
         * @type {Array}
         */
        this.classNames = {};
        this.classNames[this.CLASS_INT] = 'INT';
        this.classNames[this.CLASS_STR] = 'STR';
        this.classNames[this.CLASS_ID] = 'ID';
        this.classNames[this.CLASS_DELIM] = 'DELIM';

        /**
         * Parsed tokens
         * @type {Array}
         */
        this.tokens = [];

    };

    /**
     * @const
     * @type {number}
     */
    parser.prototype.CLASS_INT = 1;

    /**
     * @const
     * @type {number}
     */
    parser.prototype.CLASS_STR = 2;

    /**
     * @const
     * @type {number}
     */
    parser.prototype.CLASS_ID = 3;

    /**
     * @const
     * @type {number}
     */
    parser.prototype.CLASS_DELIM = 4;

    /**
     * Parse specified source
     * @param {String} source
     */
    parser.prototype.parse = function (source) {
        this.source = source;
        this.i = 0;
        while (this.i < this.source.length) {
            this.start();
        }
    };

    /**
     * Start parsing next symbol
     */
    parser.prototype.start = function () {
        this.init();
        if (this.i >= this.source.length) {
            return;
        }
        if (this.getInteger()) {

        } else if (this.getString()) {

        } else if (this.getId()) {

        } else if (this.getDelim2() || this.restoreState()) {

        } else if (this.getDelim() || this.restoreState()) {

        } else {
            this.error('Parsing error', this.i);
            this.getChar();
        }
    };

    /**
     * Store state of symbol accumulator and counters
     */
    parser.prototype.setState = function () {
        this.state = {
            i: this.i,
            char: this.char
        };
    };

    /**
     * Restore state of symbol accumulator and counters
     */
    parser.prototype.restoreState = function () {
        this.i = this.state.i;
        this.char = this.state.char;
        this.init();
    };

    /**
     * Interpreters current string sequence as integer.
     * @returns {boolean}
     */
    parser.prototype.getInteger = function () {
        if (this.is('digit')) {
            while (this.is('digit')) {
                this.add();
                this.getChar();
            }
            this.addToken(this.CLASS_INT, this.a, this.addNonTerminal(this.CLASS_INT, this.a));
            return true;
        }
        return false;
    };

    /**
     * Interpreters current string sequence as string.
     * @returns {boolean}
     */
    parser.prototype.getString = function () {
        if (this.is('quote')) {
            this.getChar();
            while (this.is('not quote')) {
                this.add();
                this.getChar();
            }
            if (this.is('quote')) {
                this.getChar();
                this.addToken(this.CLASS_STR, this.a, this.addNonTerminal(this.CLASS_STR, this.a));
                return true;
            } else {
                this.error('Not closed quote');
                return false;
            }
        }
        return false;
    };

    /**
     * Interpreters current string sequence as identifier.
     * @returns {boolean}
     */
    parser.prototype.getId = function () {
        var index;
        if (this.is('letter')) {
            this.add();
            this.getChar();
            while (this.is('letter') || this.is('digit')) {
                this.add();
                this.getChar();
            }
            index = this.lookup();
            if (index === null) {
                this.addToken(this.CLASS_ID, this.a, this.addNonTerminal(this.CLASS_ID, this.a));
                return true;
            } else {
                this.addToken(this.CLASS_DELIM, this.a, index);
                return true;
            }
        }
        return false;
    };

    /**
     * Interpreters current string sequence as two char delimiter.
     * @returns {boolean}
     */
    parser.prototype.getDelim2 = function () {
        var index;
        if (this.is('delim')) {
            this.add();
            this.getChar();
            if (this.is('delim')) {
                while (this.is('delim')) {
                    this.add();
                    this.getChar();
                }
                index = this.lookup();
                if (index !== null) {
                    this.addToken(this.CLASS_DELIM, this.a, index);
                    return true;
                }
            }
        }
        return false;
    };

    /**
     * Interpreters current string sequence as delimiter.
     * @returns {boolean}
     */
    parser.prototype.getDelim = function () {
        var index;
        if (this.is('delim')) {
            this.add();
            index = this.lookup();
            if (index !== null) {
                this.getChar();
                this.addToken(this.CLASS_DELIM, this.a, index);
                return true;
            }
        }
        return false;
    };

    parser.prototype.addToken = function (symbolClass, symbol, index) {
        this.tokens.push({
            cls: symbolClass,
            symbol: symbol,
            index: index
        });
        this.out(symbolClass, symbol, index);
    };

    /**
     * Outputs parsed symbol with class ID
     * @param {Number} symbolClass
     * @param {String} symbol
     * @param {Number} index
     */
    parser.prototype.out = function (symbolClass, symbol, index) {
        console.log('Found symbol "' + symbol + '" for class ' + symbolClass + ' with index ' + index);
    };

    /**
     * Checks current char type
     * @param {String} charType
     * @returns {boolean}
     */
    parser.prototype.is = function (charType) {
        return this.charTypes[charType].regexp.test(this.char);
    };

    /**
     * Prepare parse to work.
     */
    parser.prototype.init = function () {
        this.getNoBlank();
        this.setState();
        this.a = '';
        this.j = null;
    };

    /**
     * Get next char from source and put it into char container variable
     * and put correct char class ID into class variable.
     */
    parser.prototype.getChar = function () {
        this.char = this.source.charAt(this.i++);
        return this.char;
    };

    /**
     * Check current char and executes getChar if it blank char(space, tab or other empty char).
     */
    parser.prototype.getNoBlank = function () {
        while (this.is('whitespace')) {
            this.getChar();
        }
    };

    /**
     * Handle parsing errors.
     * @param msg
     * @param charNum
     * @param source
     */
    parser.prototype.error = function (msg, charNum, source) {
        console.log(msg);
    };

    /**
     * Check current processing lexeme string is keyword or special char
     * and ID from table into "j" variable.
     */
    parser.prototype.lookup = function () {
        var i;
        this.j = null;
        for (i = 0; i < this.terminalTable.length; i++) {
            if (this.terminalTable[i].value.toLowerCase() === this.a.toLowerCase()) {
                this.j = i;
                break;
            }
        }
        return this.j;
    };

    /**
     * Append new char to accumulator
     */
    parser.prototype.add = function () {
        this.a += this.char;
    };

    /**
     * Return string representation of symbol classes
     * @param {Number} classId
     * @returns {String}
     */
    parser.prototype.getClassName = function (classId) {
        return this.classNames[classId];
    };

    /**
     * Return full symbol table
     * @returns {Array}
     */
    parser.prototype.getTerminals = function () {
        return this.terminalTable;
    };

    /**
     * @param {number} cls
     * @returns {Array}
     */
    parser.prototype.getNonTerminals = function (cls) {
        return this.nonTerminalTable[cls];
    };

    /**
     * @private
     * @param {number} cls
     * @param {String} symbol
     * @returns {number}
     */
    parser.prototype.addNonTerminal = function (cls, symbol) {
        var i;
        for (i = 0; i < this.nonTerminalTable[cls].length; i++) {
            if (this.nonTerminalTable[cls][i] === symbol) {
                return i;
            }
        }
        return this.nonTerminalTable[cls].push(symbol) - 1;
    };

    parser.prototype.getTokens = function () {
        return this.tokens;
    };


})();
