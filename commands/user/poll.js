/*
 Dependencies:
 - modules/jsext.js
 - modules/utilities.js
 - modules/datahash.js
 */

/**
 * @fileOverview Commands for polls
 * @author TheUnknownOne
 * @version 3.0.0 Devel
 */

({
    /**
     * Returns the name of this module
     * @private
     * @return {String}
     */
    Name: function () {
        return "Commands - User: Polls";
    },
    /**
     * Returns the hooks of this module
     * @private
     * @return {Object}
     */
    Hooks: function () {
        return {
            "afterChannelJoin": function (src, chan) {
                if (DataHash.poll.mode) {
                    bot.send(src, "A poll is going on! Use <font color='green'><b>/pollinfo</b></font> for more information.", chan);
                }
            }
        };
    },
    /**
     * Returns the commands of this module
     * @private
     * @return {Object}
     */
    // TODO: Use new template stuff.
        // TODO: Admin/Mod poll commands.
    Commands: function () {
        if (Commands.Lists.user && !Commands.Lists.user.has("pollcommands")) {
            Commands.Lists.user.push("pollcommands");
        }

        return [
            {
                name: "vote",
                category: "0",
                help: [
                    "{Template::PollOption Poll Option}", "To vote for {Template::PollOption Poll Option} on the poll."
                ],
                allowedWhenMuted: false,
                handler: function (command) {
                    var num = command.data * 1,
                        ip = command.self.ip,
                        Poll = DataHash.poll,
                        options;

                    if (!Poll.mode) {
                        command.send("There is no poll.");
                        return;
                    }
                    if (!Poll.options.has(num)) {
                        command.send("Invalid option '" + num + "'.");
                        return;
                    }
                    options = Poll.options[num].votes;
                    if (options.has(ip)) {
                        command.send("You already voted!");
                        return;
                    }

                    options.push(ip);
                    Poll.votes++;

                    command.send("You voted for option " + num + " (" + Poll.options[num].name + ") on the poll!");
                }
            },
            {
                name: "pollinfo",
                category: "0",
                help: [
                    "To view the running poll's information"
                ],
                allowedWhenMuted: true,
                handler: function (command) {
                    var Poll = DataHash.poll,
                        x,
                        option;

                    if (!Poll.mode) {
                        command.send("There is no poll running at the time.");
                        return;
                    }

                    command.send("Poll started by " + Poll.starter.bold() + "!");

                    for (x in Poll.options) {
                        option = Poll.options[x].name;
                        command.send(x + ". " + option);
                    }

                    command.line();

                    if (Poll.votes === 0) {
                        command.send("No one has voted yet.");
                        return;
                    }

                    command.send(Poll.subject + " - Results so far:");

                    for (x in Poll.options) {
                        option = Poll.options[x];
                        command.send(x + ". " + option.name + " - " + option.votes.length);
                    }
                }
            }//,
            /*{
                name: "pollcommands"
            }*/
        ];
    }
})