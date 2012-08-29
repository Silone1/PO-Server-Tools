/* 

To-do List:
TEST: If it actually works.

*/

permissionHandlerForAuth = function (level) {
    return function (src) {
        if (typeof sys == "undefined") {
            return true;
        }
        if (typeof hpAuth == "undefined") {
            return sys.auth(src) >= level;
        }

        return hpAuth(src) >= level;
    }
}

defaultPermissionHandler = function (category) {
    if (category == "user") {
        return function () {
            return true;
        }
    } else if (category == "1") {
        return permissionHandlerForAuth(1);
    } else if (category == "2") {
        return permissionHandlerForAuth(2);
    } else if (category == "3") {
        return permissionHandlerForAuth(3);
    }

    return -1;
}

addCommand = function (name, handler, permissionHandler, category, help, allowedWhenMuted) {
    if (arguments.length == 1) {
        var cmd = arguments[0];
        if (typeof cmd != "object") {
            return;
        }

        name = cmd.name, handler = cmd.handler, category = cmd.category, permissionHandler = cmd.permissionHandler, category = cmd.category, help = cmd.help, allowedWhenMuted = cmd.allowedWhenMuted;
    }

    if (name == undefined) {
        print("CRITICAL MODULE COMMAND ERROR: Could not add an unknown command. Submit a bug report along with this message if you are (almost) sure this is not a code modification.");
        return;
    }

    if (handler == undefined) {
        print("CRITICAL MODULE COMMAND ERROR: Could not add command " + name + " because the handler is missing. Submit a bug report along with this message if you are (almost) sure this is not a code modification.");
        return;
    }

    if (category == undefined) {
        category = "0"; // Default
    }

    if (permissionHandler == undefined) {
        permissionHandler = defaultPermissionHandler(category);

        if (permissionHandler == -1) {
            print("CRITICAL MODULE COMMAND ERROR: Could not add command " + name + " because the permission handler was special and not passed. Submit a bug report along with this message if you are (almost) sure this is not a code modification.");
            return;
        }
    }

    if (help == undefined) {
        help = ["", ""];
    }

    if (allowedWhenMuted == undefined) {
        allowedWhenMuted = true;
    }

    this.commands[name] = {
        "name": name,
        "handler": handler,
        "permissionHandler": permissionHandler,
        "category": category,
        "help": help,
        "allowedWhenMuted": allowedWhenMuted
    };
}

if (typeof include === "undefined") {
    include = function (FileName, GetMethod) {
        if (include.cache[FileName]) {
            return include.get(FileName, GetMethod);
        }

        // Default values.
        var module = {};
        module.file = FileName;
        module.name = FileName.substring(0, FileName.indexOf("."));
        module.version = SCRIPT_VERSION; // Constant that contains your script version. Can be a number too if you don't want a variable for it. (the variable has to be a number though)
        module.hooks = {};
        module.commands = {};

        var source = {};

        try {
            source = eval(code);
        } catch (Exception) {
            source = {};
            sys.sendAll("Could not include module in file " + FileName + ": " + Exception + " on line " + Exception.lineNumber);
        }

        source["script"] = source;
        source["sys"] = sys;
        source["SESSION"] = SESSION;
        source["gc"] = gc;
        source["addCommand"] = addCommand;

        source = include.moduleProperty(module, source, "Hooks", "object");
        source = include.moduleProperty(module, source, "Version", "number");
        source = include.moduleProperty(module, source, "Name", "string");
        source = include.moduleProperty(module, source, "Commands", "object");

        if (source["Init"]) {
            source["Init"]();
            delete source["Init"];
        }

        module.source = source;

        include.cache[FileName] = module;
        include.modules.push(module);

        return include.get(FileName, GetMethod);
    }

    include.cache = {};
    include.modules = {};

    include.GetMethod = {
        "Full": 0,
        "Source": 1,
        "Hooks": 2,
        "Commands": 3,
        "File": 4,
        "Name": 5,
        "Version": 6,
    };

    include.get = function (FileName, Method) {
        if (!include.inCache(FileName)) {
            include(FileName, Method);
            return;
        }

        var query = include.cache[FileName],
            methods = include.GetMethod;

        if (Method == methods.Full) {
            return query;
        } else if (Method == methods.Source) {
            return query.source;
        } else if (Method == methods.Hooks) {
            return query.hooks;
        } else if (Method == methods.Commands) {
            return query.commands;
        } else if (Method == methods.File) {
            return query.file;
        } else if (Method == methods.Name) {
            return query.name;
        } else if (Method == methods.Version) {
            return query.version;
        } else {
            return query;
        }
    }

    include.fileExists = function (file) {
        return sys.getFileContent(file) != undefined;
    }

    include.moduleProperty = function (module, source, property, secondary_type) {
        var source_prop = source[property],
            type = typeof source_prop,
            propertyToLower = property.toLowerCase();
        if (type === "function") {
            module[propertyToLower] = source_prop();
            delete source[property];
        } else if (type === secondary_type) {
            module[propertyToLower] = source_prop;
            delete source[property];
        }

        return module;
    }

    include.download = function (Location, FileName, Force) {
        if (include.fileExists(FileName) && !Force) {
            return;
        }

        var result = sys.synchronousWebCall(Location);
        sys.writeToFile(FileName, result);

        return result;
    }

    include.update = function (Source, FileName, GetMethod) {
        download(Source, FileName, true);
        delete include.cache[FileName];
        delete include.modules[FileName];

        return include(FileName, GetMethod);
    }

    getCommand = function (module, name) {
        return include.modules[module].commands[name];
    }

    gethooks = function (event) {
        var ret = [],
            x, current_mod, Modules = include.modules;

        for (x in Modules) {
            current_mod = Modules[x];
            if (typeof current_mod.hook[event] !== "undefined") {
                ret.push(current_mod);
            }
        }

        return ret;
    }

    callhooks = function (hook_args) {
        var args = Array.prototype.slice.call(arguments),
            event = args.splice(0, 1),
            hooks = gethooks(event),
            x, current, stop = false,
            i;

        for (x in hooks) {
            current = hooks[x];
            try {
                if (current.hooks[event].apply(current, args)) {
                    stop = true;
                }
            } catch (Exception) {
                sys.sendAll("Error in module " + current.name + " when calling hook " + event + " with " + args.length + " arguments: " + Exception);
                for (i in args) {
                    print("arguments[" + i + "] = " + args[i]);
                }
            }
        }
    }

}

/* 
-- Modules --

Modules behave the same way as PO script files. 
Don't use script. outside of ({ }). Use this. instead.

Name can be a function (returns the name (string), preferred) or a string.
Version can be a function (returns the version (number), preferred) or a number.
Hooks can be a function (returns the hooks (object), preferred) or an object.
Commands can be a function (returns the commands (object), preferred) or an object.

Name, Version, Hooks, Commands are case-sensitive and can be defined in or outside of ({ }) ( Name: "foo" can be put inside ({ }) instead of a function)
include.GetMethod.Full is the default get method.

sys., SESSION., gc(), and script. are available inside ({ }) (probably outside too (except script.), but untested). They are available in the modules global scope.

Examples:
include("script_constants.js", include.GetMethod.Source); // gets the code from ({ }) (global scope)
include("script_constants.js", include.GetMethod.Version); // gets the script version. you might prefer to do include.get
include("script_constants.js", include.GetMethod.Full); // gets the module

*/

/*
-- Command API --
name => command name (string)

handler => Handler which will be called when command is used (function)
Passed argument: command (look down for help)

permissionHandler => Will be called when the command is used to test if the person can use it. Use this for channel xxx auth and tour auth only commands (function, optional) 
If omitted, uses category to "guess". Stuff WILL break (the command won't be added, actually) when you dont add a permission handler for categories other than 0, 1, 2, or 3.

Return true if it's ok, false if not. If nothing is returned, assumes true (useful for the thing below)
If a string is returned, then it is ok too. (Displays this instead of the default. Useful for various checks normally inside the command. Overall better to use in user commands)
Passed argument: src

category => Can be: 0, 1, 2, 3, channel, tournament (string, optional). 
If omitted, the command category will be "0". You can specify something else, but these are generally supported.

help => Array, optional because of "hidden" commands.
Index 0: 
	args (array|string, uses same format as 2.2 templater)
Index 1: 
	description (string) 

allowedWhenMuted => If the command can be used when muted (Don't worry about pointer commands here)
	Does message limit, (channel) silence, and (channel) mute. (Optional, default is true)

Commands lists should do:
templater.list(COMMAND_OBJECT); -> templater.list("me");
.list reads getCommand("commands.js", given_command) if the second argument is empty. 
Do: templater.list("join", "tours.js"), for example, to read the data from tours.js commands object

Best done in a loop (an array contains the command objects, for example). do this with the getCommand function.

Example inside module:

addCommand({
	"name": "me",
	"handler": function (command) {
		command.nativeHtml("<font color=magneta><timestamp/> *** " + command.selfPlayer + " " + command.escape(command.data), command.chan);
	},
	"category": "0", // Even though this optional, it's still recommended to add readability.
	"help": ["{p Message}", "Send a message to everyone which starts with ***"],
	allowedWhenMuted: false
});

or:
addCommand("me", // name
	function (command) {
		command.nativeHtml("<font color=magneta><timestamp/> *** " + command.selfPlayer + " " + command.escape(command.data), command.chan);
	}, // handler
	null, // permissionHandler
	"0", // category. (can be null too)
	["{p Message}", "Send a message to everyone which starts with ***"], // help
	false // allowedWhenMuted
);



Handler passed argument "command":
An object, containing the following:
-	src: Player who used this command. Number
-	self: Name of src. String
-	selfLower: self in lowercase. String
-	selfPlayer: Same as player(src). String
-	user: JSESSION object of src. Object
-	auth: Auth of src (including auth given by HighPermission). Number

-	data: User specified data with command. String
-	dataLower: User specified data with command, in lowercase. String

-	chan: Channel that this command was used in. Number
-	channel: JSESSION object of chan. Object

-	mcmd: User specified data, separated by ':' (no quotes). Array

-	tar: Player who was targetted by the user (uses mcmd[0]). Can be undefined if the player doesn't exist or isn't online. Number
-	tarName: Name of tar. Can be undefined. String
-	tarLower: tarName in lowercase. Can be undefined. String
-	tarPlayer: Same as player(tar). Can be undefined. String
-	target: JSESSION object of tar. Can be undefined. Object
-	ip: IP of mcmd[0]. Can be undefined. String

-	command: Command used in lowercase (pointer commands already done). String
-	fullCommand: Command in the case used (pointer commands not done yet). String

-	escape: Equal to html_escape.

-	sendMessage: Equal to botMessage(src, "message", chan); except that src and chan parameters are already specified.
-	sendAll: Equal to botAll("message", chan); except that chan parameter is already specified.
-	sendOthers: Equal to botAllExcept(src, "message", chan, botAllExcept.Normal); except that src, chan, and type(botAllExcept.Normal) parameters are already specified.

-	sendWhite: Equal to sys.sendMessage(src, "", chan);
-	sendWhiteAll: Equal to sys.sendAll("", chan);

-	sendMain: Equal to botAll("message", 0);

-	nativeSend: Equal to sys.sendAll
-	nativeHtml: Equal to sys.sendHtmlAll
*/