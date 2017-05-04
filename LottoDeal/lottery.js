const lotteryModule = require('./lottery');
const databaseModule = require('./server');
const communicationsModule = require('./communications');


const SECONDS_UNTIL_CHECK_FOR_PERFROMING_LOTTERIES = 3;

//Check if lotteries should be performed
exports.checkIfServerShouldPerformLottery = function() {
    // do whatever you like here
    // console.log('Checking if lottery should be performed')
    checkLotteries();
    setTimeout(lotteryModule.checkIfServerShouldPerformLottery, SECONDS_UNTIL_CHECK_FOR_PERFROMING_LOTTERIES * 1000);
}


//Check database for if lotteries should be performed
var checkLotteries = function() {
	databaseModule.findAllItems(function(items) {
		for (i = 0; i < items.length; i++) {
            var item = items[i];
						
            if (item.expired || item.sold) {
                continue;
            }
            var expirDate = new Date(item.expirationDate);
            if (item.amountRaised >= item.price) {
                var winner = performLottery(item);
                console.log('Item sold to ' + winner)
                communicationsModule.emailBiddersForItem(item, "LottoDeal: You lost!", "Sorry, you lost your bid for " + item.title + ". Bid again on LottoDeal!", winner);
            } else if (expirDate < Date.now()) {
                //Refund and notify users
                //refundUsers(item);
                console.log('Date has past - notifying users and marking item as expired');

                communicationsModule.emailBiddersForItem(item, "LottoDeal:" + item.title + " expired", "You have been fully refunded", "");
                item.expired = true;
                item.save();
            } else {
                // console.log('Item checked - no changes')
            }
        }
	});
}
