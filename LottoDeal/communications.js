const databaseModule = require('./server');
const communicationsModule = require('./communications');

//Email all bidders except the winner
exports.emailBiddersForItem = function(item, subject, message, winner) {
    for (var j = 0; j < item.bids.length; j++) {
        var bidderID = item.bids[j].ID;
        if (bidderID == winner) {
            continue;
        }
        console.log('searching for user' + bidderID);
        databaseModule.findUser(bidderID, function(user) {
            sendEmailToAddress(user.email, subject, message);
        }, function() {
            console.log('Error in emailBiddersForItem');
            // send404(response, request);
        });
    }
}

//Email and add notifications to all bidders, except the winner
exports.communicateToLosers = function(item, subject, message, date, winner, sold) {
    for (var j = 0; j < item.bids.length; j++) {
        var bidderID = item.bids[j].ID;
        if (bidderID == winner) {
            continue;
        }
        console.log('searching for user' + bidderID);
        if (sold == true) {
            communicateToSingleUser(item, subject, message, date, bidderID, true, winner);
        }
        else {
            communicateToSingleUser(item, subject, message, date, bidderID);
        }
        // databaseModule.findUser(bidderID, function(user) {
        //     sendEmailToAddress(user.email, subject, message);
        //     communicationsModule.addNotificationToUser(item._id, user.fbid, subject, message, date);
        // }, function() {
        //     console.log('Error in emailBiddersForItem');
        //     // send404(response, request);
        // });
    }
}

//Email and add notifications to all bidders, except the winner
exports.communicateToSingleUser = function(item, subject, message, date, userID, sold, winner) {
    databaseModule.findUser(userID, function(user) {
        sendEmailToAddress(user.email, subject, message);
        if (sold == true) {
            communicationsModule.addNotificationToUser(item._id, user.fbid, subject, message, date, true, winner);
        }
        else {
            communicationsModule.addNotificationToUser(item._id, user.fbid, subject, message, null, null);
        }
    }, function() {
        console.log('Error in communicateToSingleUser');
        // send404(response, request);
    });
}

//Prateek should add his FBID
var ADMIN_FBIDS = ['1641988472497790', '1355884977768129', '10208239805023661', '1467343223328608'];

//Emails and adds notifications to all admins, appending the winners name to the message.
exports.communicateToAdmins = function(item, subject, message, date, winnerID) {
    console.log('emailing admins');
    databaseModule.findUser(winnerID, function(winner) {
        for (var j = 0; j < ADMIN_FBIDS.length; j++) {
            var adminID = ADMIN_FBIDS[j];
            databaseModule.findUser(adminID, function(user) {
                console.log('emailing ' + user.fullName);
                var appendMessage = "    The winner of this lottery was... " + winner.fullName + "!!!";
                sendEmailToAddress(user.email, subject, message + appendMessage);
                communicationsModule.addNotificationToUser(item._id, user.fbid, subject, message + appendMessage, date);
            }, function() {
                console.log('Error in communicateToAdmins');
                // send404(response, request);
            });
        }
    }, function() {
        console.log('Error in communicateToSingleUser');
        // send404(response, request);
    });



}


function sendEmailToAddress(email, subjectText, contentText) {
    console.log('sending email');
    var helper = require('sendgrid').mail;
    from_email = new helper.Email("info@lottodeal.com");
    to_email = new helper.Email(email);
    subject = subjectText;
    content = new helper.Content("text/plain", contentText);
    mail = new helper.Mail(from_email, subject, to_email, content);

    var sg = require('sendgrid')('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');
    var request = sg.emptyRequest({
        method: 'POST',
        path: '/v3/mail/send',
        body: mail.toJSON()
    });

    sg.API(request, function(error, response) {
        console.log(response.statusCode);
        console.log(response.body);
        console.log(response.headers);
    })
}

exports.addNotificationToUser = function(itemID, userID, titleText, descriptionText, date, sold, winnerID) {
    databaseModule.findUser(userID, function(user) {
        databaseModule.findUser(winnerID, function(winner) {
            var data = {
                itemID: itemID,
                datePosted: date,
                read: false,
                title: titleText,
                description: descriptionText
            };
            if (sold != undefined && sold != null) {
                data["sold"] = true;
                data["winnerName"] = winner.fullName;
            }
            user.notifications.push(data);
            user.save();
        })
        // var data = {
        //     itemID: itemID,
        //     datePosted: date,
        //     read: false,
        //     title: titleText,
        //     description: descriptionText
        // };
        // if (winner != undefined && winner != null) {
        //     data["sold"] = true;

        // }
        // user.notifications.push(data);
        // user.save();
    }, function() {
        console.log('Error in addNotificationToUser');
    });
}