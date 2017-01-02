module.exports = function (io) {
    var users = {};

    io.on("connection", function (socket) {

        if (!socket.username) {
            //allocate a random username
            var i = 0, userExists = true;
            while (userExists) {
                var newUsername = i.toString();
                if (users[newUsername] === undefined) {
                    users[newUsername] = socket;
                    socket.username = newUsername;
                    users[newUsername].skipped = [];
                    users[newUsername].reported = 0;
                    users[newUsername].start = false;
                    userExists = false;
                } else i++;
            }
        }

        //match user with a random partner
        socket.on("match", function (callback) {
            var matched = false,
                feedback = "";

            users[socket.username].start = true;

            //checks if user is already matched
            if (users[socket.username].partner === undefined) {

                //check is user has been blocked
                if (users[socket.username].reported <= 5) {

                    //loop through all user to find a match
                    for (var username in users) {

                        //check if looped user is the user, haven't skipped each other, isn't blocked, isn't matched
                        if (username !== socket.username && users[socket.username].skipped.indexOf(username) === -1
                            && users[username].skipped.indexOf(socket.username) === -1 && users[username].partner === undefined
                            && users[username].reported <= 5 && users[username].start === true) {

                            users[username].partner = socket.username;
                            users[socket.username].partner = username;
                            users[username].emit("matched");
                            matched = true;
                            break;

                        }
                    }

                    if (!matched) feedback = "No Users Available.";

                } else {
                    feedback = "You have been blocked from chatting.";
                }

            } else {
                matched = true;
                feedback = "Already matched.";
            }

            callback(matched, feedback);
        });

        socket.on("send message", function (message, callback) {
            if (message.trim() !== "") {
                var partner = users[socket.username].partner,
                    error;
                if (partner) {
                    users[partner].emit("receive message", message);
                } else {
                    error = "You aren't matched with anyone.";
                }
            }

            callback(error);
        });

        socket.on("disconnect", function () {
            if (!socket.username) return;
            var partner = users[socket.username].partner;
            if (partner) {
                delete users[partner].partner;
                users[partner].emit("unmatched");
            }
            delete users[socket.username];
        });

        socket.on("skip", function (callback) {
            var partner = users[socket.username].partner,
                feedback;
            if (partner) {
                delete users[partner].partner;
                delete users[socket.username].partner;
                users[socket.username].skipped.push(partner);
                users[partner].emit("unmatched");
                feedback = "User has been skipped.";
            } else {
                feedback = "You aren't matched with anyone.";
            }

            callback(feedback);
        });

        socket.on("send image", function (image, callback) {
            var partner = users[socket.username].partner,
                error;
            if (partner) {
                users[partner].emit("receive image", image);
            } else {
                error = "You aren't matched with anyone.";
            }

            callback(error);
        });

        socket.on("send video", function (video, callback) {
            var partner = users[socket.username].partner,
                error;
            if (partner) {
                users[partner].emit("receive video", video);
            } else {
                error = "You aren't matched with anyone.";
            }

            callback(error);
        });

        socket.on("send video", function (audio, callback) {
            var partner = users[socket.username].partner,
                error;
            if (partner) {
                users[partner].emit("receive audio", audio);
            } else {
                error = "You aren't matched with anyone.";
            }

            callback(error);
        });

        socket.on("report", function (callback) {
            var partner = users[socket.username].partner,
                feedback;
            if (partner) {
                delete users[partner].partner;
                delete users[socket.username].partner;
                users[socket.username].skipped.push(partner);
                users[partner].reported++;
                if (users[partner].reported > 5) {
                    users[partner].emit("blocked");
                } else {
                    users[partner].emit("unmatched");
                }
                feedback = "User has been reported.";
            } else {
                feedback = "You aren't matched with anyone.";
            }

            callback(feedback);
        });

    });

};