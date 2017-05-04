const databaseModule = require('./server');

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