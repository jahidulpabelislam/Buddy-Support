var socket = io(),
    userMatched = false,

    lastMessageDate,

    months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],

    //sets up the days to be used later
    days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],

    getDateEnding = function(date) {
        var j = date % 10,
            k = date % 100;
        if (j === 1 && k !== 11) {
            return date + "st";
        }
        if (j === 2 && k !== 12) {
            return date + "nd";
        }
        if (j === 3 && k !== 13) {
            return date + "rd";
        }
        return date + "th";

    },

    addDate = function() {
        var dateText;
        var thisMessageDate = new Date();

        //checks if message is sent on the same day as last
        if ((lastMessageDate === undefined) || (lastMessageDate.getDate() !== thisMessageDate.getDate() && thisMessageDate.getMonth() !== thisMessageDate.getMonth()
            && thisMessageDate.getFullYear() !== thisMessageDate.getFullYear())) {
            dateText = days[thisMessageDate.getDay()] + " " + getDateEnding(thisMessageDate.getDate()) + " " + months[thisMessageDate.getMonth()] + " " + thisMessageDate.getFullYear();
            $("#messages").append($("<p>").addClass("date").append($("<p>").text(dateText)));
        }
        lastMessageDate = thisMessageDate;
    },

    addTime = function() {
        var hour = lastMessageDate.getHours(),
            minute = lastMessageDate.getMinutes(),
            period = "AM";
        if (hour > 12) {
            hour -= 12;
            period = "PM";
        }

        if (minute < 10) {
            minute = 0 + minute.toString();
        }

        return hour + ":" + minute + period;
    },

    setUpFeedback = function(feedback) {
        $("#startContainer").show();
        $("#feedbackContainer").show();
        $("#chat").hide();
        $("#chatButtons").hide();
        $("#messageForm").hide();
        $("#feedbackContainer").toggleClass("panel-primary", true);
        $("#feedbackContainer").toggleClass("panel-success", false);
        $button = $('<button/>').text('OK').addClass("btn btn-success").click(function() {
            $("#preferences").show();
            $("#messagesContainer").hide();
        });
        $("#feedback").text(feedback).append($button);
        $("#notification")[0].play();
        userMatched = false;
    },

    setUpChat = function() {
        $("#messages").empty();
        $("#chat").show();
        $("#messageForm").show();
        $("#chatButtons").show();
        $("#startContainer").hide();
        $("#motivationalMessage").hide();
        userMatched = true;
        expandSection();
        $("#notification")[0].play();
        $("#messages").append($("<p>").attr("id", "userDisplay").append($("<p>").text("↓ Matched User").addClass("matched")).append($("<p>").text("You ↓").addClass("user")));
    },

    matchUser = function(e) {

        $("#preferences").hide();
        $("#messagesContainer").show();

        $("#feedback").text("Finding a match...");

        socket.emit("match", function(matched, feedback, waitingMessage, blocked) {

            userMatched = matched;

            if (matched) {
                setUpChat();
            } else if (waitingMessage) {
                $("#feedbackContainer").toggleClass("panel-primary", true);
                $("#feedbackContainer").toggleClass("panel-success", false);
                $button = $('<button/>').text('Back').addClass("btn btn-warning").click(function() {
                    socket.emit("start again");
                    $("#preferences").show();
                    $("#messagesContainer").hide();
                });
                $("#feedback").text(feedback).append($button);
                $("#motivationalMessage").show();
                $("#motivationalMessage").text(waitingMessage);
            } else if (blocked) {
                blocked();
            }
        });

        e.preventDefault();
    },

    sendMessage = function(e) {
        if (userMatched) {
            if ($("#message").val().trim() !== "") {
                socket.emit("send message", $("#message").val(), function(error) {
                    if (error) {
                        $("#feedback").text(error);
                    } else {
                        addDate();
                        var time = addTime();
                        $("#messages").append($("<p>").addClass("sent").append($("<p>").text($("#message").val()).append($("<p>").addClass("time").text(time))));
                        $("#message").val("");
                        $("html, body").animate({scrollTop: $(document).height() - $(window).height()});
                    }
                });
            }
        } else {
            $("#feedback").text("You aren't matched with anyone.");
        }
        e.preventDefault();
    },

    skipUser = function() {
        if (userMatched) {
            socket.emit("skip", function(feedback) {
                setUpFeedback(feedback);
            });
        } else {
            $("#feedback").text("You aren't matched with anyone.");
        }
    },

    reportUser = function() {
        if (userMatched) {
            socket.emit("report", function(feedback) {
                setUpFeedback(feedback);
            });
        } else {
            $("#feedback").text("You aren't matched with anyone.");
        }
    },

    blocked = function() {
        $("#startContainer").show();
        $("#feedbackContainer").show();
        $("#chat").hide();
        $("#chatButtons").hide();
        $("#messageForm").hide();
        $("#feedbackContainer").toggleClass("panel-danger", true);
        $("#feedbackContainer").toggleClass("panel-primary", false);
        $("#feedbackContainer").toggleClass("panel-success", false);
        $("#feedback").text("You have been blocked.");
        $("#notification")[0].play();
        userMatched = false;
    };

$("#preferences").submit(matchUser);

socket.on("matched", setUpChat);

socket.on("unmatched", function() {
    setUpFeedback("User has left the chat.");
    $("#notification")[0].play();
});

$("#textSend").submit(sendMessage);

socket.on("receive message", function(msg) {

    addDate();
    var time = addTime();

    var difference = $(document).height() - $(document).scrollTop() == $(window).height();

    $("#messages").append($("<p>").addClass("received").append($("<p>").text(msg).append($("<p>").addClass("time").text(time))));

    if (difference) {
        $("html, body").animate({scrollTop: $(document).height() - $(window).height()});
    }

    $("#notification")[0].play();
});

$("#skipButton").click(skipUser);

$("#reportButton").click(reportUser);

socket.on("blocked", function() {
    blocked();
});

$("#preferences").change(function() {
    var topics = [];
    $.each($("input[name='topic']:checked"), function() {
        topics.push($(this).val());
    });

    var data = {
        type: $("input[name='type']:checked").val(),
        topics: topics
    };

    socket.emit("change preferences", data);
});

var typingTimeout,

    typingTimeoutFunction = function() {
        socket.emit("typing", false);
        console.log("i finished typing");
    };

$("#message").keyup(function() {
    console.log("i'm typing");
    socket.emit("typing", true);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(typingTimeoutFunction, 2000);
});

socket.on("typing", function(typing) {
    if (typing) {
        console.log("user is typing");
    } else {
        console.log("user not typing");
    }
});