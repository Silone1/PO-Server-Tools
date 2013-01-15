/* Debug commands for the server host  */

({
    Name: function () { 
        return "Commands - Host: Debugging";
    },
    Commands: function () {
        return [
            {
                name: "evald",
                permissionHandler: handlers.permissionHost,
                handler: function (command) {
                    var now, 
                        result,
                        end,
                        took;
                    
                    command.sendText("Evaluating " + command.data + ":");

                    try {
                        now = util.time.milli();
                        result = eval(command.data);
                        end = util.time.milli();
                        took = end - now;

                        command.sendText(result);
                        command.send("Code took " + took + " milliseconds / " + took / 1000 + " seconds to run. ");
                    }
                    catch (Exception) {
                        command.sendText(util.error.format(Exception));
                    }
                }
            },
            {
                name: "evala",
                permissionHandler: handlers.permissionHost,
                handler: function (command) {
                    sys.sendAll(eval(command.data));
                }
            }
        ];
    }
})