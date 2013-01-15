/* Name-ify commands for Administrators */

({
    Name: function () {
        return "Commands - Admin: Ify";
    },
    Hooks: function () {
        return {
            afterChangeTeam: function (id) {
                if (!!Settings.IfyName) {
                    sys.changeName(id, Settings.IfyName);
                }
            },
            changeName: function () {
                return !!Settings.IfyName;
            }
        };
    },
    /**
     * Returns the commands of this module
     * @private
     * @return {Array}
     */
    Commands: function () {
        CommandHandlers.Lists.admin.add("ifycommands");

        return [
            {
                name: "ify",
                category: "2",
                help: [
                    "Text::Any {Name}",
                    "Turns global server name-ify on and uses Text::Any {Name} as name."
                ],
                allowedWhenMuted: false,
                handler: function (command) {
                    var data = command.data;

                    if (!!Settings.IfyName) {
                        command.send("Ify is already on!");
                        return;
                    }
                    if (data.length > 25) { // Slightly longer name allowed.
                        command.send("The ify-name must be under 26 characters.");
                        return;
                    }

                    Settings.IfyName = data;

                    command.sendMain(command.self.player + " changed the name of everyone on the server to " + data + "!");

                    sys.playerIds().forEach(function (value, index, array) {
                        sys.changeName(value, data);
                        bot.send(value, "Your name was changed to " + data + "!");
                    });
                }
            },
            {
                name: "unify",
                category: "2",
                help: ["Turns global server name-ify off and restores the name of everyone."],
                allowedWhenMuted: false,
                handler: function (command) {
                    if (!Settings.IfyName) {
                        command.send("Ify isn't on!");
                        return;
                    }

                    Settings.IfyName = false;

                    command.sendMain(command.self.jsession.originalName + " changed all names back!");

                    sys.playerIds().forEach(function (value, index, array) {
                        sys.changeName(value, JSESSION.users(value).originalName);
                    });
                }
            },
            {
                name: "ifycommands",
                category: "2",
                help: ["To view the <b>ify</b> commands."],
                handler: function (command) {
                    new Templates.command("Ify Commands")
                        .listCommands(["ify", "unify"])
                        .render(command.src, command.chan);
                }
            }
        ];
    }
})
