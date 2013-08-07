/*jslint continue: true, es5: true, evil: true, forin: true, sloppy: true, vars: true, regexp: true, newcap: true*/
/*global sys, SESSION, script: true, Qt, print, gc, version,
    global: false, require: false, Config: true, Script: true, module: true, exports: true*/

// File: utils.js (Utils)
// Contains utilities not specificly for players, channels, and logging.
// Depends on: bot, chat-gradient, options

// No Table of Content.

(function () {
    var Bot = require('bot'),
        ChatGradient = require('chat-gradient'),
        Options = require('options');
    
    var battleClauses = [
        [256, "Self-KO Clause"],
        [128, "Wifi Clause"],
        [64, "Species Clause"],
        [32, "No Timeout"],
        [16, "Challenge Cup"],
        [8, "Item Clause"],
        [4, "Disallow Spects"],
        [2, "Freeze Clause"],
        [1, "Sleep Clause"]
    ];
     
    // Patterns for linkify
    var urlPattern = /\b(?:https?|ftps?|git):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim,
        pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim,
        emailAddressPattern = /(([a-zA-Z0-9_\-\.]+)@[a-zA-Z_]+?(?:\.[a-zA-Z]{2,6}))+/gim;
    
    // Shortcut to Object.prototype.hasOwnProperty.call
    // Allows us to use hasOwnProperty even if it has been overwritten (so exports.hasOwnProperty(exports, "hasOwnProperty") would work in this case).
    exports.hasOwnProperty = function (obj, property) {
        return Object.prototype.hasOwnProperty.call(obj, property);
    };
    
    // Team alert shortcut
    exports.teamAlertMessage = function (src, team, message) {
        Bot.sendMessage(src, "Team #" + (team + 1) + ": " + message);
    };
        
    // Invalid command shortcut
    exports.invalidCommand = function (src, command, chan) {
        Bot.escapeMessage(src, "The command " + command + " doesn't exist.", chan);
    };
        
    // No permission shortcut
    exports.noPermissionMessage = function (src, command, chan) {
        Bot.escapeMessage(src, "You may not use the " + command + " command.", chan);
    };
    
    // If the character can be used to start a command.
    exports.isCommandIndicator = function (chr) {
        return chr === "/" || chr === "!";
    };
    
    // If the character can be used to start a command that isn't stopped, meaning the message still displays.
    // e.g. 'Name: !command' is still sent to all players.
    exports.isGlobalCommandIndicator = function (chr) {
        return chr === "!";
    };
    
    // If the message shouldn't trigger a command.
    exports.shouldIgnoreIndicator = function (message) {
        // It isn't a command if it's just, say, "!".
        if (!exports.isCommandIndicator(message.charAt(0))
                || message.length === 1) {
            return true;
        }
        
        // "//", "!!", "/*", "!*"
        return ["/", "!", "*"].indexOf(message.charAt(1)) !== -1;
    };
    
    // Escapes a string's html
    exports.escapeHtml = function (msg) {
        return msg.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };
    
    // Strips HTML tags from a message.
    exports.stripHtml = function (str) {
        return str.replace(/<\/?[^>]*>/g, "");
    };

    // Escapes a string for usage in regular expressions (constructed with the RegExp constructor).
    exports.escapeRegExp = function (str) {
        return str.replace(/([\.\\\+\*\?\[\^\]\$\(\)])/g, '\\$1');
    };
    
    // Formats errors nicely.
    // Message is optional.
    exports.formatError = function (message, error) {
        var line = "";
        
        if (typeof error === "undefined") {
            error = message;
            message = "";
        }
    
        if (typeof error.toLowerCase !== 'undefined') { // when throw is used, error is a string.
            return message + " Custom Error: " + error.toString();
        }
    
        if (error.lineNumber !== 1) {
            line = " on line " + error.lineNumber;
        }
    
        return message + " " + error.name + line + ": " + error.message;
    };
    
    // Not as serious as Unix, but still meant for error reporting.
    // Prints a dump, a message, and the file the error originates from.
    // dump is optional and can be an object/array as well.
    // isWarning is to indicate that this is a warning, and not an error.
    exports.panic = function (fileName, functionName, message, dump, isWarning) {
        // don't do anything if warnings are disabled and this is a warning.
        if (!Config.Warnings && isWarning) {
            return;
        }
        
        print("");
        print((isWarning ? "Warning" : "Error") + " from " + fileName + "@" + functionName + ":");
        print(message);
        
        if (dump) {
            // turns arrays/objects/numbers into strings (doesn't like functions/etc., though).
            try {
                dump = JSON.stringify(dump);
            } catch (e) {}
            
            print("Data dump supplied: " + dump);
        }
        
        print("");
        
        if (isWarning) {
            print("Please note that this is a warning. The script should work fine, and reporting it is completely optional. In certain cases, reports might even be ignored.");
        } else {
            print("Please report this on GitHub ( https://github.com/TheUnknownOne/PO-Server-Tools/issues ) or PM ( http://pokemon-online.eu/forums/private.php?do=newpm&u=15094 ). In certain cases, features might cease to function or you might have to restart the server (don't do this right away though, unless if the error message states so).");
        }
    };
    
    // Makes the isWarning argument more readable.
    exports.panic.warning = true;
    exports.panic.error = false;
    
    // Capitalizes a message.
    exports.capitalize = function (message) {
        return message.charAt(0).toUpperCase() + message.substr(1);
    };
    
    // If the given letter is capitalized
    exports.isCapitalLetter = function (letter) {
        return (/[QWERTYUIOPASDFGHJKLZXCVBNM]/).test(letter);
    };
    
    // If the given letter isn't capitalized
    exports.isNormalLetter = function (letter) {
        return (/[qwertyuiopasdfghjklzxcvbnm]/).test(letter);
    };
    
    // Returns the length of a file (in # of characters).
    exports.fileLength = function (file) {
        return (sys.getFileContent(file) || "").length;
    };
    
    // Cuts an array starting from [entry], turning it into an array.
    // Then .join is called using [join] as argument. The result is returned (an array).
    // If the [array] isn't an array, then simply returns it back.
    exports.cut = function (array, entry, join) {
        if (!join) {
            join = "";
        }
    
        if (!Array.isArray(array)) {
            return array;
        }
    
        return [].concat(array).splice(entry).join(join);
    };
    
    // Returns the amount of keys in an object.
    exports.objectLength = function (obj) {
        return Object.keys(obj).length;
    };
    
    // Copies all values in [otherObj] to [obj]
    exports.extend = function (obj, otherObj) {
        var x;
    
        for (x in otherObj) {
            obj[x] = otherObj[x];
        }
    
        return obj;
    };
    
    // Checks if [name] is a valid tier and returns it with proper casing (if it does).
    // Otherwise returns false
    exports.isValidTier = function (name) {
        var tiers = sys.getTierList(),
            length = tiers.length,
            cur,
            i;
        
        name = name.toLowerCase();
        
        for (i = 0; i < length; i += 1) {
            cur = tiers[i];
            
            if (cur.toLowerCase() === name) {
                // this corrects the case
                return cur;
            }
        }

        // return false to indicate that tier doesn't exist.
        return false;
    };
    
    // If [n] isn't NaN, negative, or 0
    exports.isPositive = function (number) {
        return !isNaN(number) && number >= 0;
    };
    
    // If [n] isn't NaN, is negative, or is 0
    exports.isNegative = function (number) {
        return !isNaN(number) && !exports.isPositive(number);
    };
    
    // Checks if [value] is empty.
    exports.isEmpty = function (value) {
        var type = typeof value;
        
        if (!value || value === " ") {
            return true;
        }

        // check if it's negative or 0
        if (type === "number") {
            return exports.isNegative(value);
        }

        // check if there are no values
        if (Array.isArray(value)) {
            return value.length === 0;
        }
        
        // check if there are no keys
        // note that we already checked for null and array, so this is guaranteed to be an object
        if (type === "object") {
            return exports.objectLength(value) === 0;
        }

        return false;
    };
    
    // Returns "on" if bool is true,
    // "off" if false
    exports.toOnString = function (bool) {
        return bool ? "on" : "off";
    };
    
    // If something is on.
    exports.isOn = function (string) {
        var check = string.toLowerCase().indexOf;
        
        return check("yes") !== -1 || check("true") !== -1 || check("on") !== -1;
    };
    
    // Checks if 2 values are equal.
    // From Flight/flight.js: https://github.com/TheUnknownOne/Flight/blob/master/flight.js
    exports.isEqual = function (condition1, condition2) {
        var type1,
            type2,
            i,
            isArray,
            len,
            nan1,
            nan2;
        
        if (condition1 === condition2) {
            return true; // speed stuff up.
        }
        
        if ((type1 = typeof condition1) !== (type2 = typeof condition2)) {
            return false; // don't even bother wasting time.
        }
        
        if ((isNaN(condition1) && isNaN(condition2)) && type1 === "number") {
            return true;
        }
        
        if (condition1.toString || condition2.toString) {
            if (!condition1.toString || !condition2.toString) {
                return false; // they clearly aren't equal
            }
            
            if (condition1.toString() !== condition2.toString()) {
                return false; // again, speeds stuff up
            }
        }
        
        if ((isArray = Array.isArray(condition1)) !== Array.isArray(condition2)) {
            return false; // check for Array
        }
        
        
        // begin doing work.
        if (type1 === "function") {
            if (condition1.name && condition2.name) {
                if (condition1.name === condition2.name) {
                    return true; // assume they're equal
                }
            }
            
            return condition1.toString() === condition2.toString(); // assume they're equal
        }
        
        if (['string', 'boolean', 'number'].indexOf(type1) !== -1) { // already verified that both their types are equal
            return condition1 === condition2;
        }
        
        if (condition1 instanceof Date || condition2 instanceof Date) {
            if (!(condition1 instanceof Date) || !(condition2 instanceof Date)) {
                return false;
            }
            
            return condition1.valueOf() === condition2.valueOf();
        }
        
        if (condition1 instanceof RegExp || condition2 instanceof RegExp) {
            if (!(condition1 instanceof RegExp) || !(condition2 instanceof RegExp)) {
                return false;
            }
            
            return condition1.source === condition2.source &&
                condition1.global === condition2.global &&
                condition1.ignoreCase === condition2.ignoreCase &&
                condition1.multiline === condition2.multiline &&
                condition1.sticky === condition2.sticky;
        }
        
        if (isArray) {
            if ((len = condition1.length) !== condition2.length) {
                return false; // try to bail out even more
            }
            
            if (condition1.toString() === condition2.toString()) {
                return true;
            }
            
            // ugh..
            
            for (i = 0; i < len; i += 1) { // we already verified that they're of the same length
                if (!exports.deepEqual(condition1[i], condition2[i])) {
                    return false;
                }
            }
            
            return true;
        }
        
        if (condition1.toString() === "[object Object]") {
            if (Object.keys(condition1).join(':') !== Object.keys(condition2).join(':')) {
                return false;
            }
            
            // didn't work :[
            
            for (i in condition1) {
                if (!exports.hasOwnProperty(condition2, i)) {
                    return false;
                }
                
                if (!exports.deepEqual(condition1[i], condition2[i])) {
                    return false;
                }
            }
            
            for (i in condition2) {
                if (!exports.hasOwnProperty(condition1, i)) {
                    return false;
                }
                
                if (!exports.deepEqual(condition2[i], condition1[i])) {
                    return false;
                }
            }
            
            return true;
        }
        
        return condition1 === condition2; // safety
    };
    
    // Turns [time] into a string (for example, 60 becomes "1 Minute")
    // TODO: Comments
    exports.timeToString = function (timeToFormat) {
        var ret = [],
            times = [
                [2629744, "month"],
                [604800, "week"],
                [86400, "day"],
                [3600, "hour"],
                [60, "minute"],
                [1, "second"]
            ],
            len = times.length,
            currentTime,
            time,
            i;

        if (timeToFormat < 0) {
            return "0 seconds";
        }
        
        for (i = 0; i < len; i += 1) {
            time = times[i];
            currentTime = parseInt(timeToFormat / time[0], 10);
            
            if (currentTime > 0) {
                ret.push(currentTime + " " + time[1] + (currentTime > 1 ? "s" : ""));
                timeToFormat -= currentTime * time[0];
                
                if (timeToFormat <= 0) {
                    break;
                }
            }
        }
        
        if (ret.length === 0) {
            return "1 second";
        }

        return exports.fancyJoin(ret);
    };
    
    // A more fancy looking version than the default .join
    // TODO: Comments
    exports.fancyJoin = function (array) {
        var retstr = "",
            arrlen = array.length - 1;

        if (arrlen + 1 < 2) {
            return array.join("");
        }

        array.forEach(function (value, index) {
            if (index === arrlen) {
                retstr = retstr.substr(0, retstr.lastIndexOf(",")) + " and " + array[index];
                return;
            }

            retstr += array[index] + ", ";
        });

        return retstr;
    };
    
    exports.callEvent = function (name, args) {
        // this is quite rare..
        if (!script) {
            print("Runtime Error (from scripts/utils.js:callEvent): script doesn't exist.");
            return;
        }
        
        if (!script[name]) {
            print("Runtime Error (from scripts/utils.js:callEvent): script." + name + " doesn't exist.");
            return;
        }
        
        // wrap it in a try/catch
        
        try {
            // properly set the scope.
            script[name].apply(script[name], [].slice.call(arguments, 1));
        } catch (e) {
            print("Runtime Error (from scripts/utils.js:callEvent): script." + name + " returned an error: " + exports.formatError(e));
        }
    };
    
    // Calls multiple events.
    // Array should be as follows: [["eventName", "eventArgument1", "eventArgumentEtc"], ["etc"]]
    exports.callEvents = function (events) {
        var length = events.length,
            event,
            i;
        
        for (i = 0; i < length; i += 1) {
            event = events[i];
            // defined at "exports.callEvent = function callEvent"
            exports.callEvent.apply(this, [event[0], [].slice.call(arguments, 1)]);
        }
    };
    
    // Finishes a sentence by adding '.' to it if the last character isn't '.', '?', '!', or ';'.
    exports.finishSentence = function (string) {
        var lastCharacter = string[string.length - 1];
        
        if (!lastCharacter) {
            return "";
        }
        
        // if the last character isn't...
        if (['.', '?', '!', ';'].indexOf(lastCharacter) !== -1) {
            string += ".";
        }
        
        return string;
    };
    
    // Ensures the file [fileName] exists, and writes [defaultContent] to it if it doesn't.
    // defaultContent is optional; nothing will be written regardless if the file exists or not if it isn't passed.
    exports.createFile = function (fileName, defaultContent) {
        sys.appendToFile(fileName, "");
        
        if (defaultContent && sys.getFileContent(fileName) === "") {
            sys.writeToFile(fileName, defaultContent);
        }
    };
    
    /* Changes all occurances of %num in [string] to the argument at the position of [string] + 1
        
        For example, when called like: format("Goodbye, %1. %2", playerName, randomGoodbye),
        the string returned will, for example, be "Goodbye, TheUnknownOne. Hope you had a nice time!" if playerName would be "TheUnknownOne"
        and randomGoodbye would be "Hope you had a nice time!". 
        
        This function is similar to http://qt-project.org/doc/qt-4.8/qstring.html#arg , except that it accepts all the arguments in one go.
        
        Very important to note that if, for example, you call the function with 3 arguments (the string and the 2 arguments that are replaced).
        but the string is, for example, "%1 %2 %3", %3 will remain untouched ("TheUnknownOne Hope you had a nice time! %3", it will be called the same way
        as illustrated above, but with the example string given in this section).
    */
    exports.format = function (string) {
        var argsLength = arguments.length,
            i;
        
        // start at the first argument, which is the string.
        for (i = 1; i < argsLength; i += 1) {
            string = string.replace(new RegExp("%" + (i + 1), "gm"), arguments[i]);
        }
        
        return string;
    };
    
    // Displays the script update message to every player.
    exports.scriptUpdateMessage = function () {
        var timeToRun = ((new Date()).getTime() - Script.loadStart),
            took = "Load time: " + timeToRun / 1000 + " seconds.";

        Script.loadStart = (new Date()).getTime();

        if (Options.isStartingUp) {
            print("\t\tServer Script has been loaded.\t\t\n\t\tEvaluation Time: " + timeToRun / 1000 + " seconds.\t\t");
            return;
        }
        
        sys.sendHtmlAll('<center><table border="1" width="50%" style="background: qradialgradient(cy: 0.1, cx: 0.5, fx: 0.9, fy: 0, radius: 2 stop: 0 black, stop: 1 white);"><tr style="background: qradialgradient(cy: 0.1, cx: 0.5, fx: 0.9, fy: 0, radius: 2 stop: 0 black, stop: 1 white);"><td align="center"><img src="pokemon:493&back=true" align="left"><img src="pokemon:385&back=false" align="right"><font size="4"><b><br/> ' + Options.serverName + ' - Scripts <br/></b></font> Scripts have been updated! <br/> ' + took + ' <br/> ~ ' + Script.version + ' ~ <br/></td></tr></table></center>', 0);
        
        // Refresh the gradient in the main channel, if it uses one.
        if (ChatGradient.hasChannel(0)) {
            ChatGradient.refresh(0);
        }
    };
    
    // Removes all spaces from a string.
    exports.removeSpaces = function (str) {
        return str.split(" ").join("");
    };
    
    // Sorts an object alphabetically. sortArrays is an option that also sorts the arrays in the object (optional).
    // NOTE: Doesn't copy over non-enumerable objects.
    exports.sortObject = function (obj, sortArrays) {
        var keys = Object.keys(obj),
            sortedObject = {},
            key,
            len = keys.length,
            i;

        keys.sort();

        for (i = 0; i < len; i += 1) {
            key = keys[i];
            
            if (typeof obj[key] === 'object' && !Array.isArray(obj[key]) && obj[key] !== null) {
                obj[key] = exports.sortObject(obj[key]);
            } else if (sortArrays && Array.isArray(obj[key])) {
                obj[key].sort();
            }
            
            sortedObject[key] = obj[key];
        }

        return sortedObject;
    };
    
    // Returns a human readable list of clauses returned by sys.getClauses(tier)
    // NOTE: The array isn't pretty printed.
    exports.clauseList = function (clauses) {
        var tierClauses,
            clause,
            len,
            i;
        
        for (i = 0, len = battleClauses.length; i < len; i += 1) {
            clause = battleClauses[i];
            
            if (clauses >= clause[0]) {
                tierClauses.push(clause[1]);
                clauses -= clause[0];
            }
        }

        return tierClauses;
    };
    
    // Returns a pokemon's sprite (HTML).
    exports.pokemonSprite = function (num, shiny, back, genderId, gen) {
        // Allows us to accept pokemon names too.
        if (typeof num === "string") {
            // Unknown pokemon.
            if (!sys.pokeNum(num)) {
                return "<img src='pokemon:0'>";
            }
            
            num = sys.pokeNum(num);
        }

        var gender = "neutral";
        
        // Defaults the gen to 5.
        gen = gen || 5;
        
        if (gen < 1 || gen > 5) {
            gen = 5;
        }
        
        if (genderId) {
            gender = {
                0: "neutral",
                1: "male",
                2: "female"
            }[parseInt(genderId, 10)] || "neutral";
        }

        // Makes sure the gen and pokemon is in boundaries.
        if ((gen === 2 && num > 251)
                || (gen === 3 && num > 386)
                || (gen === 4 && num > 493)) {
            gen = 5;
        }

        return "<img src='pokemon:" + num + "&shiny=" + shiny + "&back=" + back + "&gender=" + gender + "&gen=" + gen + "'>";
    };
    
    // Adds clickable links to a message for urls, pseudo urls, and email addresses.
    exports.linkify = function (message) {
        return message
            .replace(urlPattern, '<a target="_blank" href="$&">$&</a>')
            .replace(pseudoUrlPattern, '$1<a target="_blank" href="http://$2">$2</a>')
            .replace(emailAddressPattern, '<a target="_blank" href="mailto:$1">$1</a>');
    };
}());