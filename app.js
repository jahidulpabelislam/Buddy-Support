var express = require("express"),
    app = express(),
    http = require("http").Server(app),
    io = require("socket.io")(http),
    nodeMailer = require("nodemailer"),
    bodyParser = require('body-parser'),
    users = {};

http.listen(9000, function () {
    console.log("listening on *:9000");
});

app.use(express.static(__dirname + "/public"));

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({extended: true}));

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/public/view/chat.html");
});

app.get("/contact/", function (req, res) {
    res.sendFile(__dirname + "/public/view/contact.html");
});

app.post("/contact/", function (req, res) {
    var validEmailPattern = /\b[\w._-]+@[\w-]+.[\w]{2,}\b/im,
        result = validEmailPattern.test(req.body.emailInput);

    if (req.body.emailInput.trim() !== "" && req.body.messageInput.trim() !== "" && result) {

        var transporter = nodeMailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'up733474@myport.ac.uk',
                    pass: hidden
                }
            }),

            mailOptions = {
                replyTo: req.body.emailInput,
                to: 'up733474@myport.ac.uk',
                subject: req.body.subjectInput || 'Buddy Support Email',
                text: req.body.messageInput
            };

        transporter.sendMail(mailOptions, function (error) {
            res.send(JSON.stringify({
                ok: !error,
                feedback: error ? "Something went wrong, please try again." : "Your message has been sent."
            }));
        });

    } else {
        var response = {ok: false};

        if (req.body.emailInput.trim() === "") {
            response.emailFeedback = "Email Address must be provided and valid.";
        } else if (!result) {
            response.emailFeedback = "Email Address must be valid.";
        }

        if (req.body.messageInput.trim() === "") {
            response.messageFeedback = "Message must be provided.";
        }

        res.send(JSON.stringify(response));
    }

});

io.on("connection", function (socket) {
    socket.on("start", function () {
        if (!socket.username) {
            //allocate a random username
            var i = 0, userExists = true;
            while (userExists) {
                var newUsername = i.toString();
                if (users[newUsername] === undefined) {
                    users[newUsername] = socket;
                    socket.username = newUsername;
                    users[newUsername].skipped = [];
                    userExists = false;
                } else i++;
            }
        }
    });

    socket.on("match", function (callback) {
        var matched = false;
        //allocate a random partner
        for (var username in users) {
            if (username !== socket.username && users[socket.username].skipped.indexOf(username) === -1 && users[username].skipped.indexOf(socket.username) === -1 && users[username].partner === undefined) {
                users[username].partner = socket.username;
                users[socket.username].partner = username;
                users[username].emit("matched");
                matched = true;
                break;
            }
        }
        callback(matched);
    });

    socket.on("send message", function (message) {
        if (message.trim() !== "") {
            var partner = users[socket.username].partner;
            if (partner) {
                users[partner].emit("receive message", message);
            }
        }
    });

    socket.on("disconnect", function () {
        if (!socket.username) return;
        var partnerUsername = users[socket.username].partner;
        if (partnerUsername) {
            delete users[partnerUsername].partner;
            users[partnerUsername].emit("unmatched");
        }
        delete users[socket.username];
    });

    socket.on("skip", function (callback) {
        var partnerUsername = users[socket.username].partner;
        if (partnerUsername) {
            delete users[partnerUsername].partner;
            delete users[socket.username].partner;
            users[socket.username].skipped.push(partnerUsername);
            users[partnerUsername].emit("unmatched");
        }

        callback();
    });

    socket.on("send image", function (image) {
        var partnerUsername = users[socket.username].partner;
        if (partnerUsername) {
            users[partnerUsername].emit("receive image", image);
        }
    });

    socket.on("send video", function (video) {
        var partnerUsername = users[socket.username].partner;
        if (partnerUsername) {
            users[partnerUsername].emit("receive video", video);
        }
    });

    socket.on("send video", function (audio) {
        var partnerUsername = users[socket.username].partner;
        if (partnerUsername) {
            users[partnerUsername].emit("receive audio", audio);
        }
    });
});