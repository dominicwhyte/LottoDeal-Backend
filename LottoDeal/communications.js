const databaseModule = require('./server');
const communicationsModule = require('./communications');

//Email all bidders except the winner
exports.emailBiddersForItem = function(item, subject, message, winner) {
    for (var j = 0; j < item.bids.length; j++) {
        var bidderID = item.bids[j].ID;
        if (bidderID == winner) {
            continue;
        }
        databaseModule.findUser(bidderID, function(user) {
            sendEmailToAddress(user.email, subject, message);
        }, function() {
            console.log('Error in emailBiddersForItem');
        });
    }
}

//Email and add notifications to all bidders. Sold represents if the item was sold
exports.communicateToBidders = function(item, subject, message, date, sold) {
    for (var j = 0; j < item.bids.length; j++) {
        var bidderID = item.bids[j].ID;
        if (sold == true) {
            communicationsModule.communicateSoldToSingleUser(item, subject, message, date, bidderID);
        } else {
            communicationsModule.communicateToSingleUser(item, subject, message, date, bidderID);
        }
    }
}

//Send communications to a single user
exports.communicateToSingleUser = function(item, subject, message, date, userID) {
    databaseModule.findUser(userID, function(user) {
        sendEmailToAddress(user.email, subject, message);
            console.log('Sending regular notification to: ' + user.fullName);
            communicationsModule.addRegularNotificationToUser(item._id, user.fbid, subject, message);
    }, function() {
        console.log('Error in communicateToSingleUser');
    });
}

exports.communicateSoldToSingleUser = function(item, subject, message, date, userID) {
    databaseModule.findUser(userID, function(user) {
        console.log('Sending sold notification to: ' + user.fullName);
        sendEmailToAddress(user.email, subject, message);
        communicationsModule.addSoldNotificationToUser(item._id, user.fbid, subject, message, date, item.winnerID, item.title);
    }, function() {
        console.log('Error in communicateToSingleUser');
    });
}

//Prateek should add his FBID
var ADMIN_FBIDS = ['1641988472497790', '1355884977768129', '10208239805023661', '1467343223328608'];

//Emails and adds notifications to all admins, appending the winners name to the message.
exports.communicateToAdmins = function(item, subject, message, date, winnerID) {
    databaseModule.findUser(winnerID, function(winner) {
        for (var j = 0; j < ADMIN_FBIDS.length; j++) {
            var adminID = ADMIN_FBIDS[j];
            databaseModule.findUser(adminID, function(user) {
                var appendMessage = "    The winner of this lottery was... " + winner.fullName + "!!!";
                sendEmailToAddress(user.email, subject, message + appendMessage);
                communicationsModule.addRegularNotificationToUser(item._id, user.fbid, subject, message + appendMessage, date);
            }, function() {
                console.log('Error in communicateToAdmins');
            });
        }
    }, function() {
        console.log('Error in communicateToSingleUser');
    });
}


function sendEmailToAddress(email, subjectText, contentText) {
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
        if (error != null) {
            console.log("Error sending email via sendgrid:" + error)
        }
    })
}

//Adds a notification to a user with userID, for an itemID. 
exports.addRegularNotificationToUser = function(itemID, userID, titleText, descriptionText, date) {
    databaseModule.findUser(userID, function(user) {
        var data = {
            itemID: itemID,
            datePosted: date,
            read: false,
            title: titleText,
            description: descriptionText
        };
        user.notifications.push(data);
        user.save();
    }, function() {
        console.log('Error in addNotificationToUser');
    });
}

//Adds a notification to a user with userID, for an itemID, for when an item has been sold
exports.addSoldNotificationToUser = function(itemID, userID, titleText, descriptionText, date, winnerID, itemTitle) {
    databaseModule.findUser(userID, function(user) {
        databaseModule.findUser(winnerID, function(winner) {
            var data = {
                itemID: itemID,
                datePosted: date,
                read: false,
                title: titleText,
                description: descriptionText,
                sold: true,
                winnerName: winner.fullName
            };
            user.notifications.push(data);
            user.save();
        }, function() {
            console.log('Error in addNotificationToUser');
        })
    }, function() {
        console.log('Error in addNotificationToUser');
    });
}