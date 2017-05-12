const lotteryModule = require('./suggestionsAlgorithm');
const databaseModule = require('./server');
const serverModule = require('./server');
const communicationsModule = require('./communications');


const SECONDS_UNTIL_CHECK_FOR_PERFROMING_LOTTERIES = 3;

//Check if lotteries should be performed
exports.checkIfServerShouldPerformLottery = function() {
    checkLotteries();
    setTimeout(lotteryModule.checkIfServerShouldPerformLottery, SECONDS_UNTIL_CHECK_FOR_PERFROMING_LOTTERIES * 1000);
}


//Check database for if lotteries should be performed. Performs lottery and communicates to users if necessary
var checkLotteries = function() {
    databaseModule.findAllItems(function(items) {
        for (i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.expired || item.sold) {
                continue;
            }
            var expirDate = new Date(item.expirationDate);
            if (item.amountRaised >= item.price) {
                performLottery(item, function(winner) {
                    var date = new Date();
                    communicationsModule.communicateToLosers(item, "LottoDeal: You lost!", "Sorry, you lost your bid for " + item.title + ". Bid again on LottoDeal!", date, winner, true);
                    communicationsModule.communicateToSingleUser(item, "LottoDeal: You won!", "Congratulations, you won your bid for" + item.title + "! We'll be in contact shortly to arrange item delivery.", date, winner, true, winner );
                    communicationsModule.communicateToAdmins(item, "What's up admin, we've got a winner on LottoDeal!", "There was a winner for " + item.title + ".", date, winner);
                    communicationsModule.communicateToSingleUser(item, "LottoDeal: Your item " + item.title + " has been sold!", "Click here to view who won:", date, item.sellerID, true, winner);
                });
            } else if (expirDate < Date.now()) {
                //Refund and notify users
                lotteryModule.refundUsers(item);
                var date = new Date();
                communicationsModule.communicateToLosers(item, "LottoDeal:" + item.title + " expired", "You have been fully refunded", date, "");
                item.expired = true;
                item.save();
            } else {
                // console.log('Item checked - no changes')
            }
        }
    });
}

//Performs the lottery for item, calling completion with the userID of the winner
var performLottery = function(item, completion) {
    var bids = item.bids;
    //Shuffle to ensure no bias (extra precaution)
    var shuffledBids = shuffleArray(bids);
    var randomNum = Math.random();
    var num = 0.0;
    var winner = "";
    for (var j = 0; j < shuffledBids.length; j++) {
        var bidderID = shuffledBids[j].ID;
        var bidderAmount = shuffledBids[j].amount;
        num += bidderAmount / item.price;
        if (randomNum < num) {
            winner = bidderID;
            break;
        }
    }
    if (winner == "") {
        console.log('Error: No winner - defaulting to first bidder in random array')
        if (bids.length != 0) {
            winner = shuffledBids[0].bidderID
        }
    }
    item.sold = true;
    item.winnerID = winner;

    databaseModule.findUser(winner, function(user) {
        if (user != null) {
            item.winnerName = user.fullName;
            item.save();
            completion(winner);
        } else {
            console.log('User not successfully found')
            completion(null);
        }
    }, function() {
        console.log('Error in performLottery');
    });
}

//Shuffles an array to assure randomness
//Shuffle array - modified from http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
var shuffleArray = function(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

//Refunds the bidders of an item
exports.refundUsers = function(item) {
    for (var j = 0; j < item.bids.length; j++) {
        var bid = item.bids[j];
        for (var i = 0; i < bid.chargeIDs.length; i++) {
            var chargeID = bid.chargeIDs[i];
            var stripe = require("stripe")("sk_test_eg2HQcx67oK4rz5G57XiWXgG");

            stripe.refunds.create({
                charge: chargeID,
            }, function(err, refund) {
                if (refund == null || err != null) {
                    console.log('Refund failed')
                }
            });
        }
    }
}