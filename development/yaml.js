/*
YAML parser for Javascript
Author: Diogo Costa

This program is released under the MIT License as follows:

Copyright (c) 2011 Diogo Costa (costa.h4evr@gmail.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 
 -------------------------------------------------------------------------
 Modified by TheUnknownOne to match coding style and make it work with PO.
*/

YAML = (function () {
    var errors = [],
        reference_blocks = [],
        processing_time = 0,
        regex = {
            "regLevel": new RegExp("^([\\s\\-]+)"),
            "invalidLine": new RegExp("^\\-\\-\\-|^\\.\\.\\.|^\\s*#.*|^\\s*$"),
            "dashesString": new RegExp("^\\s*\\\"([^\\\"]*)\\\"\\s*$"),
            "quotesString": new RegExp("^\\s*\\\'([^\\\']*)\\\'\\s*$"),
            "float": new RegExp("^[+-]?[0-9]+\\.[0-9]+(e[+-]?[0-9]+(\\.[0-9]+)?)?$"),
            "integer": new RegExp("^[+-]?[0-9]+$"),
            "array": new RegExp("\\[\\s*(.*)\\s*\\]"),
            "map": new RegExp("\\{\\s*(.*)\\s*\\}"),
            "key_value": new RegExp("([a-z0-9_-][ a-z0-9_-]*):( .+)", "i"),
            "single_key_value": new RegExp("^([a-z0-9_-][ a-z0-9_-]*):( .+?)$", "i"),
            "key": new RegExp("([a-z0-9_-][ a-z0-9_-]+):( .+)?", "i"),
            "item": new RegExp("^-\\s+"),
            "trim": new RegExp("^\\s+|\\s+$"),
            "comment": new RegExp("([^\\\'\\\"#]+([\\\'\\\"][^\\\'\\\"]*[\\\'\\\"])*)*(#.*)?")
        };

    function Block(lvl) {
        return {
            parent: null,
            length: 0,
            level: lvl,
            lines: [],
            children: [],
            addChild: function (obj) {
                this.children.push(obj);
                obj.parent = this;
                ++this.length;
            }
        };
    }

    function parse(src, ondone) {
        var content = sys.getFileContent(src);
        ondone(YAML.eval(content));
    }

    function parser(str) {
        var regLevel = regex["regLevel"],
            invalidLine = regex["invalidLine"],
            lines = str.split("\n"),
            m, level = 0,
            curLevel = 0,
            blocks = [],
            result = new Block(-1),
            currentBlock = new Block(0),
            levels = [],
            line = "",
            i = 0,
            len = lines.length,
            added, k, oldBlock;

        result.addChild(currentBlock);

        blocks.push(currentBlock);
        levels.push(level);

        for (; i < len; ++i) {
            line = lines[i];

            if (line.match(invalidLine)) {
                continue;
            }

            if (m = regLevel.exec(line)) {
                level = m[1].length;
            } else {
                level = 0;
            }

            if (level > curLevel) {
                oldBlock = currentBlock;
                currentBlock = new Block(level);
                oldBlock.addChild(currentBlock);
                blocks.push(currentBlock);
                levels.push(level);
            } else if (level < curLevel) {
                added = false;

                k = levels.length - 1;
                for (; k >= 0; --k) {
                    if (levels[k] == level) {
                        currentBlock = new Block(level);
                        blocks.push(currentBlock);
                        levels.push(level);
                        if (blocks[k].parent != null) {
                            blocks[k].parent.addChild(currentBlock);
                        }
                        added = true;
                        break;
                    }
                }

                if (!added) {
                    errors.push("Error: Invalid indentation at line " + i + ": " + line);
                    return;
                }
            }

            currentBlock.lines.push(line.replace(regex["trim"], ""));
            curLevel = level;
        }

        return result;
    }

    function processValue(val) {
        val = val.replace(regex["trim"], "");
        var m = null;

        if (val == 'true') {
            return true;
        } else if (val == 'false') {
            return false;
        } else if (val == '.NaN') {
            return Number.NaN;
        } else if (val == 'null') {
            return null;
        } else if (val == '.inf') {
            return Number.POSITIVE_INFINITY;
        } else if (val == '-.inf') {
            return Number.NEGATIVE_INFINITY;
        } else if (m = val.match(regex["dashesString"])) {
            return m[1];
        } else if (m = val.match(regex["quotesString"])) {
            return m[1];
        } else if (m = val.match(regex["float"])) {
            return parseFloat(m[0]);
        } else if (m = val.match(regex["integer"])) {
            return parseInt(m[0]);
        } else if (!isNaN(m = Date.parse(val))) {
            return new Date(m);
        } else if (m = val.match(regex["single_key_value"])) {
            var res = {};
            res[m[1]] = processValue(m[2]);
            return res;
        } else if (m = val.match(regex["array"])) {
            var count = 0,
                c = ' ',
                res = [],
                content = "",
                str = false,
                j = 0,
                lenJ = m[1].length;

            for (; j < lenJ; ++j) {
                c = m[1][j];
                if (c == '\'' || c == '"') {
                    if (str === false) {
                        str = c;
                        content += c;
                        continue;
                    } else if ((c == '\'' && str == '\'') || (c == '"' && str == '"')) {
                        str = false;
                        content += c;
                        continue;
                    }
                } else if (str === false && (c == '[' || c == '{')) {
                    ++count;
                } else if (str === false && (c == ']' || c == '}')) {
                    --count;
                } else if (str === false && count == 0 && c == ',') {
                    res.push(processValue(content));
                    content = "";
                    continue;
                }

                content += c;
            }

            if (content.length > 0) {
                res.push(processValue(content));
            }

            return res;
        } else if (m = val.match(regex["map"])) {
            var count = 0,
                c = ' ',
                res = [],
                content = "",
                str = false,
                j = 0,
                lenJ = m[1].length;

            for (; j < lenJ; ++j) {
                c = m[1][j];
                if (c == '\'' || c == '"') {
                    if (str === false) {
                        str = c;
                        content += c;
                        continue;
                    } else if ((c == '\'' && str == '\'') || (c == '"' && str == '"')) {
                        str = false;
                        content += c;
                        continue;
                    }
                } else if (str === false && (c == '[' || c == '{')) {
                    ++count;
                } else if (str === false && (c == ']' || c == '}')) {
                    --count;
                } else if (str === false && count == 0 && c == ',') {
                    res.push(content);
                    content = "";
                    continue;
                }

                content += c;
            }

            if (content.length > 0) {
                res.push(content);
            }

            var newRes = {},
                j = 0,
                lenJ = res.length;
            for (; j < lenJ; ++j) {
                if (m = res[j].match(regex["key_value"])) {
                    newRes[m[1]] = processValue(m[2]);
                }
            }

            return newRes;
        } else {
            return val;
        }
    }

    function processFoldedBlock(block) {
        var lines = block.lines,
            children = block.children,
            str = lines.join(" "),
            chunks = [str],
            i = 0,
            len = children.length;

        for (; i < len; ++i) {
            chunks.push(processFoldedBlock(children[i]));
        }
        return chunks.join("\n");
    }

    function processLiteralBlock(block) {
        var lines = block.lines,
            children = block.children,
            str = lines.join("\n"),
            i = 0,
            len = children.length;

        for (; i < len; ++i) {
            str += processLiteralBlock(children[i]);
        }
        return str;
    }

    function processBlock(blocks) {
        var m = null,
            res = {},
            lines = null,
            children = null,
            currentObj = null,
            level = -1,
            processedBlocks = [],
            isMap = true,
            j = 0,
            lenJ = blocks.length,
            i = 0,
            line, key, len, value, nb, v, no, k;

        for (; j < lenJ; ++j) {

            if (level != -1 && level != blocks[j].level) {
                continue;
            }

            processedBlocks.push(j);

            level = blocks[j].level;
            lines = blocks[j].lines;
            children = blocks[j].children;
            currentObj = null;

            for (len = lines.length; i < len; ++i) {
                line = lines[i];

                if (m = line.match(regex["key"])) {
                    key = m[1];

                    if (key[0] == '-') {
                        key = key.replace(regex["item"], "");
                        if (isMap) {
                            isMap = false;
                            if (typeof res.length === "undefined") {
                                res = [];
                            }
                        }
                        if (currentObj != null) {
                            res.push(currentObj);
                        }
                        currentObj = {};
                        isMap = true;
                    }

                    if (typeof m[2] != "undefined") {
                        value = m[2].replace(regex["trim"], "");
                        if (value[0] == '&') {
                            nb = processBlock(children);
                            if (currentObj != null) {
                                currentObj[key] = nb;
                            }
                            else {
                                res[key] = nb;
                            }
                            reference_blocks[value.substr(1)] = nb;
                        } else if (value[0] == '|') {
                            if (currentObj != null) {
                                currentObj[key] = processLiteralBlock(children.shift());
                            }
                            else {
                                res[key] = processLiteralBlock(children.shift());
                            }
                        } else if (value[0] == '*') {
                            v = value.substr(1);
                            no = {};

                            if (typeof reference_blocks[v] == "undefined") {
                                errors.push("Reference '" + v + "' not found!");
                            } else {
                                for (k in reference_blocks[v]) {
                                    no[k] = reference_blocks[v][k];
                                }

                                if (currentObj != null) {
                                    currentObj[key] = no;
                                }
                                else {
                                    res[key] = no;
                                }
                            }
                        } else if (value[0] == '>') {
                            if (currentObj != null) {
                                currentObj[key] = processFoldedBlock(children.shift());
                            }
                            else {
                                res[key] = processFoldedBlock(children.shift());
                            }
                        } else {
                            if (currentObj != null) {
                                currentObj[key] = processValue(value);
                            }
                            else {
                                res[key] = processValue(value);
                            }
                        }
                    } else {
                        if (currentObj != null) {
                            currentObj[key] = processBlock(children);
                        }
                        else {
                            res[key] = processBlock(children);
                        }
                    }
                } else if (line.match(/^-\s*$/)) {
                    if (isMap) {
                        isMap = false;
                        if (typeof(res.length) === "undefined") {
                            res = [];
                        }
                    }
                    if (currentObj != null) {
                        res.push(currentObj);
                    }
                    currentObj = {};
                    isMap = true;
                    continue;
                } else if (m = line.match(/^-\s*(.*)/)) {
                    if (currentObj != null) currentObj.push(processValue(m[1]));
                    else {
                        if (isMap) {
                            isMap = false;
                            if (typeof res.length === "undefined") {
                                res = [];
                            }
                        }
                        res.push(processValue(m[1]));
                    }
                    continue;
                }
            }

            if (currentObj != null) {
                if (isMap) {
                    isMap = false;
                    if (typeof res.length === "undefined") {
                        res = [];
                    }
                }
                res.push(currentObj);
            }
        }

        for (j = processedBlocks.length - 1; j >= 0; --j) {
            blocks.splice.call(blocks, processedBlocks[j], 1);
        }

        return res;
    }

    function semanticAnalysis(blocks) {
        var res = processBlock(blocks.children);
        return res;
    }

    function preProcess(src) {
        var m, lines = src.split("\n"),
            r = regex["comment"],
            i;

        for (i in lines) {
            if (m = lines[i].match(r)) {
                if (typeof m[3] !== "undefined") {
                    lines[i] = m[0].substr(0, m[0].length - m[3].length);
                }
            }
        }

        return lines.join("\n");
    }

    function eval(str) {
        errors = [];
        reference_blocks = [];
        processing_time = (new Date()).getTime();

        var pre = preProcess(str),
            doc = parser(pre),
            res = semanticAnalysis(doc);

        processing_time = (new Date()).getTime() - processing_time;

        return res;
    }

    return {
        parse: parse,
        eval: eval,
        getErrors: function () {
            return errors;
        },
        getProcessingTime: function () {
            return processing_time;
        }
    }
})();