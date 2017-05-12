/* SERVER FUNCTIONALITY */
var express = require('express')
var app = express()
var https = require('https')
var fs = require('fs')
var http = require("http");

var json = require('express-json')
var bodyParser = require("body-parser")
app.use(bodyParser.urlencoded({
    extended: false
}));

const suggestionsModule = require('./suggestionsAlgorithm');
const lotteryModule = require('./lottery');
const databaseModule = require('./server');
const communicationsModule = require('./communications');

var Jimp = require("jimp");

app.use(bodyParser.json())
app.use(json())
app.use(express.static(__dirname + "/public"))
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

var maxSize = 1.2 * Math.pow(10, 7); // 12MB

var multer = require('multer')
var upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: maxSize
    }
})

var debug = false;

module.exports = {
        goToDebugMode: function() {
            debug = true;
            console.log(debug);
        },
        goToProductionMode: function() {
            debug = false;
            console.log(debug);
        }
    }
    // exports.goToDebugMode = function() {
    // 	debug = true;
    // 	console.log(debug);
    // }


var helmet = require("helmet")
app.use(helmet())

var fs = require('fs');

// var options = {
//     key: fs.readFileSync('domain.key'),
//     cert: fs.readFileSync('server.crt')
// };

// var options = {
//     key: fs.readFileSync('domain.key'),
//     cert: fs.readFileSync('chained.pem')
// };

app.use(function(req, res, next) {
    var allowedOrigins = ['https://dominicwhyte.github.io', 'http://www.lottodeal.us'];
    var origin = req.headers.origin;
    if (allowedOrigins.indexOf(origin) > -1) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.header('Access-Control-Allow-Credentials', true);
        return next();
    } else {
        res.send("Oops! You can't access our API")
    }
});

// A user has bid on an item, add this bid to database
app.post('/createReview', function(request, response) {
    // get into database, access object, update it's bid field and add to user bids

    var sellerID = request.body.sellerID;
    var accessToken = request.body.accessToken;
    var stars = request.body.stars;
    var reviewDes = request.body.reviewDes;
    var date = new Date();

    if (accessToken != undefined) {
        // create Review
        validateAccessToken(accessToken, response, request, function(userID) {
            if (userID != undefined && sellerID != userID) {
                createReview(sellerID, userID, stars, reviewDes, date);
                response.send("review added!")
            } else {
                response.send("You can't review yourself!")
            }
        });
    } else {
        response.send("Please logout and login before you review someone!")
    }
})



// Stripe Code---------------------------------------------------------
// var stripe = require("stripe")("sk_live_msslA7kve35X187k6sYkfl7v");
var stripe = require("stripe")("sk_test_eg2HQcx67oK4rz5G57XiWXgG");

// A user has bid on an item, add this bid to database
app.post('/performPaymentAndAddBid', function(request, response) {
    var accessToken = request.body["accessToken"];
    var itemID = request.body.itemID;
    var amountToCharge = request.body.amount; //Check that this is numerical
    validateAccessToken(accessToken, response, request, function(userID) {
        // get into database, access object, update it's bid field and add to user bids
        findItemByID(itemID, function(item) {
            amountToCharge *= 1
            if (item != null && isInt(amountToCharge) && (!item.expired) && (!item.sold) && (item.amountRaised + amountToCharge <= item.price)) {
                addBidForItem(itemID, userID, amountToCharge, function(status) {
                    console.log('Adding payment for ' + amountToCharge);
                    var token = request.body.stripeToken; // Using Express
                    // Charge the user's card:
                    var charge = stripe.charges.create({
                        amount: amountToCharge * 100, //in cents
                        currency: "usd",
                        description: "Charge for LottoDeal " + request.body.itemTitle,
                        source: token,
                    }, function(err, charge) {
                        if (charge != null) {
                            dollarAmount = (charge.amount / 100);
                            console.log('Charging payment for ' + dollarAmount);
                            if (err != null) {
                                console.log("Error: " + err);
                            }
                            var date = new Date();
                            //Check that amountToCharge is same as actual stripe payment that came through
                            if (amountToCharge != dollarAmount) {
                                console.log('Error: amountToCharge is not equal to dollarAmount');
                                //remove the bid that was added
                                removeBidForItem(itemID, userID, amountToCharge, function(status) {
                                    //Refund the user
                                    if (charge != null) {
                                        stripe.refunds.create({
                                            charge: charge._id,
                                        }, function(err, refund) {
                                            if (refund == null || err != null) {
                                                console.log('Refund failed')
                                            }
                                        });
                                    }

                                    if (!status) {
                                        console.log('Error: removeBidForItem');
                                    }
                                    response.status(401);
                                    response.type('txt').send('Error bidding on item');
                                })
                            } else {
                                addChargeIDToItem(itemID, userID, charge._id);
                                communicationsModule.addNotificationToUser(itemID, userID, "New Bid", "You just bid $" + Number(dollarAmount).toFixed(2), date);
                                response.send("charge is" + charge.amount);
                            }
                        } else {
                            //remove the bid for the item
                            removeBidForItem(itemID, userID, amountToCharge, function(status) {
                                //Refund the user
                                if (charge != null) {
                                    stripe.refunds.create({
                                        charge: charge._id,
                                    }, function(err, refund) {
                                        if (refund == null || err != null) {
                                            console.log('Refund failed')
                                        }
                                    });
                                }
                                if (!status) {
                                    console.log('Error: removeBidForItem');
                                }
                            })
                            console.log('Error: Stripe charge is null - removing bid');
                            response.status(401);
                            response.type('txt').send('Error bidding on item');
                        }

                    });
                });
            } else {
                console.log('Oops, you cannot bid on this item anymore!');
                response.status(401);
                response.type('txt').send('Error bidding on item');
                return;
            }
        }, function() {
            send404(response, request);
        });
    });
})


//End Stripe Code ------------------------------------------------------

//START USER AUTHENTICATION CODE

var httprequest = require("request");

//Validates an access token. Provide response and request in case a 404 
//error should be thrown
function validateAccessToken(accessToken, response, request, callback) {
    httprequest({
        uri: "https://graph.facebook.com/me?access_token=" + accessToken,
        method: "GET",
        timeout: 10000,
        followRedirect: true,
        maxRedirects: 10
    }, function(error, validateResponse, body) {
        if (body == undefined || body === "undefined") {
            console.log('Error in validating accessToken. Error is not null or userID is null: ' + error);
            send404(response, request);
        } else {
            body = JSON.parse(body);
            var userID = body.id;

            if (error != null || userID == null) {
                console.log('Error in validating accessToken. Error is not null or userID is null: ' + error);
                send404(response, request);
            } else {
                callback(userID);
            }
        }
    });
}

//END USER AUTHENTICATION CODE

// Send back the reviews on the passed in item parameter, in case user wants to
// see the people that bid on his item
app.get('/getReviews', function(request, response) {

    var sellerID = request.query["sellerID"];

    findUser(sellerID, function(user) {
        if (user != null) {
            response.send(JSON.stringify(user.reviews));
        } else {
            console.log('Error: user is null in getReviews');
        }
    }, function() {
        send404(response, request);
    });
})

// send the reviews on the item page based on the seller of the item
app.get('/getReviewsOfSeller', function(request, response) {
    var itemID = request.query["itemID"];

    findItemByID(itemID, function(item) {
        if (item != null) {
            findUser(item.sellerID, function(user) {
                response.send(JSON.stringify(user.reviews));

            }, function() {
                send404(response, request);
            });
        } else {
            console.log('Error: user is null in getReviews');
        }
    }, function() {
        send404(response, request);
    });
})


// Check if a user is already registered in the database
app.get('/checkIfUser', function(request, response) {
    var accessToken = request.query["accessToken"];
    validateAccessToken(accessToken, response, request, function(userID) {
        if (userID != undefined) {
            User.find({
                fbid: userID
            }, function(err, user) {
                if (user.length > 1) {
                    console.log('Error: multiple users with FBID')
                } else if (user.length == 1) {
                    response.send(true);
                } else {
                    console.log("Error: returning false in checkIfUser")
                    response.send(false);
                }
            });
        }
    });
})

// mark all notifications read
app.get('/markRead', function(request, response) {
    var accessToken = request.query["accessToken"];
    validateAccessToken(accessToken, response, request, function(userID) {
        if (userID != undefined) {
            User.find({
                fbid: userID
            }, function(err, users) {
                if (users.length != 0) {
                    var user = users[0];
                    if (user != null) {
                        var notifications = user.notifications;
                        for (var i = 0; i < notifications.length; i++) {
                            notifications[i].read = true;
                        }
                        user.save();
                        notifications = user.notifications;
                        response.send(JSON.stringify(notifications.reverse()));
                    } else {
                        console.log('Error: user is null in getAccount');
                    }
                }
            });
        }
    });
})

//Get account, where account is the private account with all info of the logged in user
app.get('/getAccount', function(request, response) {
    var accessToken = request.query["accessToken"];
    validateAccessToken(accessToken, response, request, function(userID) {
        findUser(userID, function(user) {
            if (user != null) {
                response.send(JSON.stringify(user));
            } else {
                console.log('Error: user is null in getAccount');
            }
        }, function() {
            send404(response, request);
        });
    });
})

//Gets a public account for any FBID, with only public information returned
app.get('/getPublicAccount', function(request, response) {
    var userID = request.query["userID"];
    findUser(userID, function(user) {
        if (user != null) {
            response.send(JSON.stringify(trimUser(user)));
        } else {
            console.log('Error: user is null in getAccount');
        }
    }, function() {
        send404(response, request);
    });
})

// send back all the suggested items
app.get('/getSuggestions', function(request, response) {
    var accessToken = request.query["accessToken"];
    validateAccessToken(accessToken, response, request, function(userID) {
        findUser(userID, function(user) {
            if (user != null) {
                suggestionsModule.computeSimilarities(userID, User, Item, function(suggestions) {
                    //trim the items to avoid sending back chargeIDs
                    response.send(JSON.stringify(trimItems(suggestions)));
                });
            } else {
                console.log('Error: user is null in getAccount');
            }
        }, function() {
            send404(response, request);
        });


    })
})

//Send 404 ERROR
function send404(response, request) {
    console.log('Error: Sending 404');
    response.status(404);

    // respond with html page
    if (request.accepts('html')) {
        // CAN DO RESPONSE.RENDER HERE
        response.sendFile(__dirname + "/views/404.html", {
            url: request.url
        });
        return;
    }
    // respond with json
    if (request.accepts('json')) {
        response.send({
            error: 'Not found'
        });
        return;
    }
    // default to plain-text. send()
    response.type('txt').send('Not found');
}

// send back all the notifications
app.get('/getNotifications', function(request, response) {
    var accessToken = request.query["accessToken"];
    validateAccessToken(accessToken, response, request, function(userID) {
        getNotificationsForUsers(userID, function(notifications) {
            if (notifications != null) {
                //Reverse to get right order on frontend
                response.send(JSON.stringify(notifications.reverse()));
            } else {
                console.log('Error: notifications is null in getNotifications');
            }
        });
    });
})

//Verifies an access token and returns the userID associated to it
app.get('/verifyAccessToken', function(request, response) {
    var accessToken = request.query["accessToken"];
    validateAccessToken(accessToken, response, request, function(userID) {
        if (userID != null) {
            response.send(userID);
        }
    });
})

// send back all the bids of a user
app.get('/getBidsOfUsers', function(request, response) {
    var userID = request.query["userID"];
    getBidsForUsers(userID, function(bids) {
        if (bids != null) {
            response.send(JSON.stringify(bids));
        } else {
            console.log('Error: bids is null in getBidsofUsers');
        }

    });
})



// adds up all the reviews for a given seller into its respective accounts
// array
function compileReviews(item, users, accounts) {
    var sellerID = item.sellerID;
    for (var j = 0; j < users.length; j++) {
        var user = users[j]
        if (sellerID == user.fbid) {
            if (user.reviews.length != 0) {
                var reviews = user.reviews;
                var length = reviews.length;
                var total = 0;
                var average = 0;
                var averageRounded = 0;
                if (length != 0) {
                    var total = 0;
                    for (var k = 0; k < length; k++) {
                        total += parseInt(reviews[k].stars);
                    }
                    var average = total / length;
                    var averageRounded = Math.round(average * 10) / 10

                }
                var account = {
                    averageRating: averageRounded,
                }
                accounts.push(account);
            } else {
                var account = {
                    averageRating: "No Ratings Yet",
                }
                accounts.push(account);
            }
        }
    }
    return accounts;
}

// send back all the items that a user bidded on and sorts them into active items
// and items that have already sold or expired.
app.get('/getBiddedItemsOfUsers', function(request, response) {
    var accessToken = request.query["accessToken"];
    validateAccessToken(accessToken, response, request, function(userID) {
        getItemsForUsers(userID, function(items) {
            var curBidsAccounts = [];
            var oldBidsAccounts = [];
            var oldBiddedItems = [];
            var curBiddedItems = [];

            if (items != null) {
                findAllUsers(function(users) {
                    if (users != null) {
                        for (var i = 0; i < items.length; i++) {
                            var item = items[i];

                            // current bidded items
                            if (!item.sold && !item.expired) {
                                curBiddedItems.push(item);
                                curBidsAccounts = compileReviews(item, users, curBidsAccounts);
                            }
                            // expired/sold items
                            else {
                                oldBiddedItems.push(item)
                                oldBidsAccounts = compileReviews(item, users, oldBidsAccounts);
                            }
                        }
                    } else {
                        console.log("Error: Users null in getBiddedItemsOfUsers");
                    }

                    var allAccountsAndItems = {
                        oldBiddedItems: oldBiddedItems,
                        curBiddedItems: curBiddedItems,
                        curBidsAccounts: curBidsAccounts,
                        oldBidsAccounts: oldBidsAccounts,
                    }
                    response.send(JSON.stringify(allAccountsAndItems))
                });
            } else {
                console.log('Error: items is null in getBiddedItemsofUsers');
            }
        });
    });
})

// send back all the items that user has listed
app.get('/getListedItemsForUsers', function(request, response) {

    var userID = request.query["userID"];
    getListedItemsForUsers(userID, function(items) {
        if (items != null) {
            response.send(JSON.stringify(trimItems(items)));
        } else {
            console.log('Error: items is null in getListedItemsForUsers');
        }

    }, function() {
        send404(response, request);
    });
})

// send back all the items that a user has sold
app.get('/getSoldItemsForUsers', function(request, response) {
    var userID = request.query["userID"];
    getSoldItemsForUsers(userID, function(items) {
        response.send(JSON.stringify(trimItems(items)));
    }, function() {
        send404(response, request);
    });
})


// test to see if the server is running
app.get('/', function(request, response) {
    response.send("API is working!")
})


app.post('/debugPost', function(request, response) {
    var imagePath = './uploads/debug.png';
    var imageData = fs.readFileSync(imagePath);

    var image = {}
    image["contentType"] = 'image/png';

    Jimp.read(imagePath, function(err, img) {
        img.scaleToFit(500, 500) // CAN EDIT THE SCALING HERE TO BE A LITTLE SMALLER FOR PERFORMANCE
            .getBase64(Jimp.AUTO, function(err, src) {
                if (err) {
                    console.log("Error: " + err);
                }
                image["compressed"] = src;
                var title = request.body.title;
                var price = request.body.price;
                var offset = request.body.expirDate;
                var expirationDate = new Date()
                var date = new Date();

                if (offset == 1) {
                    expirationDate.setDate(date.getDate() + 1);
                } else if (offset == 2) {
                    expirationDate.setDate(date.getDate() + 7);
                } else {
                    expirationDate.setDate(date.getDate() + 30);
                }
                var shortDescription = request.body.shortDescription;
                var longDescription = request.body.longDescription;
                var sellerID = request.body.userID;
                createItem(title, price, date, expirationDate, shortDescription, longDescription, sellerID, image, function(id) {
                    response.redirect('https://dominicwhyte.github.io/LottoDeal-Frontend/sell.html#!/?value=success&id=' + id);
                }, function() {
                    send404(response, request);
                }, imageData, response, request);
            })
    })
});

var cpUpload = upload.fields([{
        name: 'title',
        maxCount: 1
    }, {
        name: 'price',
        maxCount: 1
    }, {
        name: 'picture',
        maxCount: 1
    }, {
        name: 'description',
        maxCount: 1
    }, {
        name: 'expirDate',
        maxCount: 1
    }, {
        name: 'userID',
        maxCount: 1
    }]) // SHOULDNT LONG DESCRIPTION AND SHORT DESCRIPTION BE ADDED INTO THIS

// create a post/item 
app.post('/createPost', cpUpload, function(req, res, next) {

    // CHECK FOR SIZE OF IMAGE
    var imgSize = req.files['picture'][0].size;
    if (imgSize > maxSize) {
        res.redirect('https://dominicwhyte.github.io/LottoDeal-Frontend/sell.html#!/?value=sizeTooLarge');
        return;
    }

    // Check to make sure that the elements in the form were properly formatted:
    var title = req.body.title;
    var price = req.body.price;
    var offset = req.body.expirDate;
    var shortDescription = req.body.shortDescription;
    var longDescription = req.body.longDescription;
    var accessToken = req.body.accessToken;

    if (title == null || price == null || !isInt(price) || offset == null || shortDescription == null || longDescription == null || accessToken == null) {
        res.redirect("https://dominicwhyte.github.io/LottoDeal-Frontend/sell.html#!/?value=improperFormat")
        return;
    }

    if (title.length > 100 || price > 1000000000 || (offset < 0 || offset > 4) || shortDescription.length > 200 || longDescription.length > 2000) {
        res.redirect("https://dominicwhyte.github.io/LottoDeal-Frontend/sell.html#!/?value=improperFormat")
        return;
    }
    if (title.length < 0 || price < 1 || shortDescription.length < 0 || longDescription.length < 0) {
        res.redirect("https://dominicwhyte.github.io/LottoDeal-Frontend/sell.html#!/?value=improperFormat")
        return;
    }



    validateAccessToken(accessToken, res, req, function(sellerID) {
        var picture = req.files['picture'][0]
        if (picture.mimetype != "image/jpeg" && picture.mimetype != "image/png") {
            res.redirect("https://dominicwhyte.github.io/LottoDeal-Frontend/sell.html#!/?value=improperFormat")
            return;
        }



        var imagePath = "./uploads/" + picture.filename;
        var imageData = fs.readFileSync(imagePath);
        var image = {}
            // image["data"] = imageData
        image["contentType"] = 'image/png';


        // backend is done with the image now, so it can be deleted from uploads folder (since readfile was sync)
        fs.unlink(imagePath, function(error) {
            if (error != null) {
                console.log("Error: " + error);
            }
        })

        // create compressed version
        Jimp.read(imageData, function(err, img) {
            if (err) {
                console.log("Error: " + err);
            }
            img.scaleToFit(500, 500) // crop(100, 100, 300, 200) // CAN EDIT THE SCALING HERE TO BE A LITTLE SMALLER FOR PERFORMANCE
                .write(imagePath + picture.filename + "compressed").getBase64(Jimp.AUTO, function(err, src) {
                    if (err) {
                        console.log("Error: " + err);
                    }
                    image["compressed"] = src;
                    var title = req.body.title;
                    var price = req.body.price;
                    var offset = req.body.expirDate;
                    var expirationDate = new Date()
                    var date = new Date();

                    if (offset == 1) {
                        expirationDate.setDate(date.getDate() + 1);
                    } else if (offset == 2) {
                        expirationDate.setDate(date.getDate() + 7);
                    } else if (offset == 3) {
                        expirationDate.setDate(date.getDate() + 30);
                    } else {
                        expirationDate.setSeconds(expirationDate.getSeconds() + 30);
                    }
                    var shortDescription = req.body.shortDescription;
                    var longDescription = req.body.longDescription;
                    createItem(title, price, date, expirationDate, shortDescription, longDescription, sellerID, image, function(id) {
                        res.redirect('https://dominicwhyte.github.io/LottoDeal-Frontend/sell.html#!/?value=success&id=' + id);
                    }, function() {
                        send404(res, req);
                    }, imageData, res, req);
                })
        })
    });


})

//modified from http://stackoverflow.com/questions/14636536/how-to-check-if-a-variable-is-an-integer-in-javascript
function isInt(value) {
    if (isNaN(value)) {
        return false;
    }
    var x = parseFloat(value);
    return (x | 0) === x;
}

// finds all the reviews of a user and returns the associated image 
// and names of the people that reviewed the given perosn 
app.get('/getReviewerImagesAndNames', function(request, response) {
    var userID = request.query["userID"];
    var reviewersID = []
    findUser(userID, function(user) {
        if (user != null) {
            var reviews = user.reviews;
            for (var i = 0; i < reviews.length; i++) {
                reviewersID.push(reviews[i].userID);
            }
            User.find({
                fbid: reviewersID
            }, function(err, reviewers) {
                var reviewersToSend = [];
                for (var i = 0; i < reviewersID.length; i++) {
                    for (var j = 0; j < reviewers.length; j++) {
                        if (reviewersID[i] == reviewers[j].fbid) {
                            reviewersToSend.push(reviewers[j]);
                            break;
                        }
                    }
                }
                response.send(reviewersToSend);
            });
        } else {
            console.log('Error: User is null in getReviewerImagesandNames');
        }
    }, function() {
        send404(response, request);
    });
});


// Will add a new user to our database
app.post('/createUser', function(request, response) {
    // Parse the response
    var name = request.body.name;
    var id = request.body.fbid;
    var url = request.body.url;
    var email = request.body.email;
    var age = request.body.age;
    var gender = request.body.gender;

    var users = findAllUsers(function(users) {
        if (users != null) {
            var usersLength = users.length;
            var found = 0;

            for (var i = 0; i < usersLength; i++) {
                if (users[i].fbid === id) {
                    response.send("User already exists");
                    found = 1;
                }
            }

            if (!found) {
                createUser(name, id, url, email, age, gender);
                response.send("You have created a new user");
            }
        } else {
            console.log('Error: users is null in createUser');
            respond.send(null);
        }

    });
})


// Will add a new user to our database
app.post('/updateSettings', function(request, response) {
    var accessToken = request.body["accessToken"];
    validateAccessToken(accessToken, response, request, function(userID) {
        if (userID != null) {
            // Parse the response
            var email = request.body.email;
            findUser(userID, function(user) {
                if (user != null) {
                    user.email = email;
                    user.save();
                    response.send("updated settings");
                } else {
                    console.log("Error: Failed to update settings");
                    response.send("Failed to update settings");
                }

            }, function() {
                send404(response, request);
            });
        }
    });


})


// Send back all posts
app.get('/getPosts', function(request, response) {
    // get all of the posts and return them to frontend to load on feed
    var items = findAllItems(function(items) {
        if (items != null) {
            response.send(JSON.stringify(items));
        } else {
            console.log('Error: items is null');
        }

    });

})

// Send back all the accounts average rating for all posts
app.get('/getAccountsForPosts', function(request, response) {
    // get all of the accounts for all posts


    var listedAccounts = [];
    var soldAccounts = [];
    var expiredAccounts = [];

    var items = findAllItems(function(items) {
        if (items != null) {
            findAllUsers(function(users) {
                if (users != null) {
                    for (var i = 0; i < items.length; i++) {
                        var item = items[i];
                        // listed items
                        if (!item.sold && !item.expired) {
                            listedAccounts = compileReviews(item, users, listedAccounts);
                        }
                        // sold items
                        else if (item.sold && !item.expired) {
                            soldAccounts = compileReviews(item, users, soldAccounts);
                        }
                        // expired items
                        else {
                            expiredAccounts = compileReviews(item, users, expiredAccounts);
                        }
                    }
                } else {
                    console.log("Error: Users null");
                }


                var allAccounts = {
                    listedAccounts: listedAccounts,
                    soldAccounts: soldAccounts,
                    expiredAccounts: expiredAccounts,
                }
                response.send(JSON.stringify(allAccounts))

            });
        } else {
            console.log('Error: Items null');
        }

    });

})



// Send back a specific item
app.get('/getItem', function(request, response) {
    var itemID = request.query.id;

    findItemByID(itemID, function(item) {
        if (item != null) {
            findImageByID(item["_id"], function(buffer) {
                item.img.compressed = buffer;
                response.send(JSON.stringify(trimItem(item)));
            }, function() {
                send404(response, request);
            })
        } else {
            console.log("Error: item is null in getItem");
        }

    }, function() {
        send404(response, request);
    });
})

// Send back either a serialized or full version of all users
app.get('/getUsers', function(request, response) {

    var users = findAllUsers(function(users) {
        if (users != null) {
            response.send(JSON.stringify(users))
        } else {
            console.log("Error: users is null in getUsers");
        }

    });

})

// Delete a user account
app.delete('/deleteUser', function(request, response) {
    var id = request.body.id;
    deleteUser(id, function(message) {
        response.send(message);
    })

})

// Delete an Item
app.delete('/deleteItem', function(request, response) {
    var accessToken = request.body.accessToken;
    var itemIDToDelete = request.body.id
    validateAccessToken(accessToken, response, request, function(userID) {
        findItemByID(itemIDToDelete, function(item) {
            if (item != null) {
                response.header('Access-Control-Allow-Methods', 'DELETE');
                //Check that the user has the right to delete this item
                var isCorrectUser = (item.sellerID == userID);
                if (isCorrectUser && (!item.sold) && (!item.expired)) {
                    deleteItem(itemIDToDelete, function(message) {
                        response.send(message);
                    });
                } else {
                    console.log('Error: Item cannot be deleted');
                    send404(response, request);
                }

            } else {
                send404(response, request);
            }
        }, function() {
            console.log('Error: user is null in getAccount');
            send404(response, request);
        });

        findUser(userID, function(user) {

        }, function() {
            console.log('Error in deleteItem');
            send404(response, request);
        });
    });
})

app.post('/editItem', function(request, response) {
    // get into database, access object, update it's bid field and add to user bids

    var itemID = request.body.itemID;
    var title = request.body.title;
    var price = request.body.price;
    var expirationDate = request.body.expirationDate;
    var shortDescription = request.body.shortDescription;
    var longDescription = request.body.longDescription;

    var imgSize = request.files['picture'][0].size;
    if (imgSize > maxSize) {
        res.redirect('https://dominicwhyte.github.io/LottoDeal-Frontend/sell.html#!/?value=sizeTooLarge');
    }

    var picture = request.files['picture'][0]
    var imagePath = "./uploads/" + picture.filename;
    var imageData = fs.readFileSync(imagePath);
    var image = {}
    image["data"] = imageData
    image["contentType"] = 'image/png';


    editItem(title, price, expirationDate, shortDescription, longDescription, itemID, image);

    response.send("Edited Item successfully")
})



app.get('/getImagesForNotifications', function(request, response) {
    var itemIDs = request.query["itemIDs"];
    if (itemIDs != undefined) {

        Item.find({}, function(err, items) {
            var imagesCompressed = [];
            for (var i = 0; i < itemIDs.length; i++) {
                var id = itemIDs[i];
                for (var j = 0; j < items.length; j++) {
                    if (items[j]._id == itemIDs[i]) {
                        imagesCompressed.push(items[j].img.compressed)
                    }
                }
            }
            response.send(JSON.stringify(imagesCompressed));

        }, function() {
            send404(response, request);
        });
    } else {
        response.send([]);
        return;
    }
})

http.createServer(app).listen(8000, function() {
    console.log("Server started at port 8000")
})

/* START OF MONGO FUNCTIONS */
const ITEM_COLLECTION = 'Items';
const USER_COLLECTION = 'Users';

var MongoClient = require('mongodb').MongoClient,
    assert = require('assert');

var ObjectId = require('mongodb').ObjectID;

var mongoose = require('mongoose');

// Connection URL
var url = 'mongodb://localhost:27017/LottoDeal';

// Use connect method to connect to the server

mongoose.Promise = global.Promise;


mongoose.connect(url, function(err, db) {
    if (err) {
        console.log('Error: connecting to mongo server');
    }
    var postmark = require("postmark");

    // deleteAllUsers();
    // deleteAllItems();
    // deleteAllImages();

    //Begin checking if lotteries should be performed
    lotteryModule.checkIfServerShouldPerformLottery();
});



var Schema = mongoose.Schema;

// create a schema
var userSchema = new Schema({
    fullName: String, // facebook given (String)
    fbid: String, // facebook given
    email: String, // facebook given email
    pictureURL: String, //profile pic URL from Facebook (String)
    bids: [{
        itemID: String, // item they bidded on
        amount: Number // amount they bidded
    }], //Bid object as dictionary containing all current bids of that user (indexed by itemID).  If a person bids twice on an item, the bid for that itemID is increased (Dictionary)
    reviews: [{ // reviews on sellers
        userID: String, // who reviewed them
        stars: Number, // how many stars given
        reviewDes: String, // description of review
        datePosted: Date, //date the review was created (String - parse into Date object)
    }],
    userInfo: {
        age: Number, // age of user
        gender: String // gender of user
    },
    notifications: [{ // notifications to show user
        read: Boolean, // whether they read them
        title: String, // title of notification
        description: String, // description of notification
        datePosted: Date, //date the notification was created (String - parse into Date object)
        itemID: String, // item associated with the notification
        sold: Boolean, // whether the item associated with the notification was sold
        winnerName: String, // the winner's name if applicable to an item
    }],
});



var User = mongoose.model('User', userSchema);

exports.Item = Item;
exports.User = User;

// create a schema
var itemSchema = new Schema({
    title: String, // title of the item being sold (String)
    price: Number, //price in USD (int)
    datePosted: Date, //date the item was posted (String - parse into Date object)
    expirationDate: Date, // date when if the item was not sold then everyone gets refunded (String- parse into Date object)
    amountRaised: Number, //total amount raised
    bids: [{
        ID: String, // who bidded on the item
        amount: Number, // how much they bidded
        chargeIDs: [String] ////charge ID, in case refund should be issued
    }], //Dictionary of fbid’s of users who have placed bids (Dictionary)
    shortDescription: String, // text string of what exactly is being sold (String)
    longDescription: String, // long description of what is being sold
    img: {
        data: Buffer, // stores an image here
        compressed: String, // compressed version
        contentType: String
    },
    // picture: String,
    sold: Boolean, // has the item been sold
    expired: Boolean, //is the item expired
    sellerID: String, // who's selling the item
    sellerName: String, // name of the seller (for displaying on news feed)
    winnerID: String, // who the winner of an item is
    winnerName: String, // the name of the winner
});

var Item = mongoose.model('Item', itemSchema);


var imageSchema = new Schema({
    itemID: String, // item associated with the image
    img: {
        data: String, // the actual image
    }
})

var Image = mongoose.model('Image', imageSchema);


// allows them to be used outside of this module
module.exports = User;
module.exports = Item;
module.exports = Image;


// create a user in the database given their name, facebook ID, url of the picture
// email address, age, and gender
var createUser = function(name, id, url, email, age, gender) {
    if (age == null || isNaN(age)) {
        age = 25
    }
    if (gender == null) {
        gender = ""
    }


    var newUser = new User({
        fullName: name,
        email: email,
        fbid: id,
        pictureURL: url,
        bids: [],
        reviews: [],
        userInfo: {
            age: age,
            gender: gender
        },
        notifications: []
    });

    // call the built-in save method to save to the database
    newUser.save(function(err) {
        if (err) {
            console.log('Error: saving new user');
        }
    });
}

// create an item given the title, price, current date, expiraation data, descriptions, seller ID, and picture.
var createItem = function(title, price, datePosted, expirationDate, shortDescription, longDescription, sellerID, picture, callback, errorCallback, buffer, response, request) {
    findUser(sellerID, function(seller) {
        if (seller != null) {
            var newItem = new Item({
                title: title,
                price: price,
                datePosted: datePosted,
                expirationDate: expirationDate,
                amountRaised: 0,
                shortDescription: shortDescription,
                longDescription: longDescription,
                bids: [],
                sold: false,
                expired: false,
                sellerID: sellerID,
                sellerName: seller.fullName,
                img: picture
            });
            newItem.save(function(err, newItem) {
                // if (err) throw err; // THERE SHOULD BE AN ERROR CALLBACK HERE
                if (err) {
                    errorCallback();
                }

                createImage(newItem["_id"], buffer);

                callback(newItem["_id"])
            });
            newItem.save(function(err) {
                if (err) throw err;
            });
        } else {
            console.log('Error: Item saved unsuccessfully');
        }
    }, function() {
        send404(response, request);
    });
}

// gets the notifications for a given user based on the facebook ID
var getNotificationsForUsers = function(userID, callback) {
    findUser(userID, function(user) {
        if (user != null) {
            callback(user.notifications);
        } else {
            console.log('Error: user is null in getNotificationsForUsers');
        }
    }, function() {
        console.log('Error: user is null in getNotificationsForUsers');
    });
}

// gets the bids for a user given their facebook ID
var getBidsForUsers = function(userID, callback) {
    findUser(userID, function(user) {
        if (user != null) {
            callback(user.bids);
        } else {
            console.log('Error: user is null in getBidsForUsers');
        }
    }, function() {
        console.log('Error: user is null in getBidsForUsers');
    });

}

//Removes ChargeIDs from the items, to keep this information from leaving the server side
function trimItems(items) {
    var trimmedItems = []
    for (var i = 0; i < items.length; i++) {
        trimmedItems.push(trimItem(items[i]));
    }
    return trimmedItems;
}

//Removes ChargeIDs from the item, to keep this information from leaving the server side
function trimItem(item) {
    for (var j = 0; j < item.bids; j++) {
        var bid = item.bids[j];
        bid.chargeIDs = null;
    }
    return item;
}

function trimUsers(users) {
    var trimmedUsers = []
    for (var i = 0; i < users.length; i++) {
        trimmedUsers.push(trimUser(users[i]));
    }
    return trimmedUsers;
}

// trims a given users important information
function trimUser(user) {
    user.userInfo = null;
    user.notifications = null;
    user.bids = null;
    return user;
}

// gets all the items that a person bidded on given their facebook ID
var getItemsForUsers = function(userID, callback) {
    User.find({
        fbid: userID
    }, function(err, user) {
        if (user.length != 0) {
            var itemIDs = [];
            var bids = user[0].bids;
            for (var i = 0; i < bids.length; i++) {
                itemIDs.push(bids[i].itemID);
            }
            Item.find({
                '_id': itemIDs
            }, function(err, items) {
                callback(items);
            });
        } else {
            console.log('Error: user array is empty');
            callback(null);
        }
    });
}

// finds all the items that a person listed given their facebook ID
var getListedItemsForUsers = function(userID, callback, errorCallback) {
    Item.find({
        sellerID: userID,
        sold: false
    }, function(err, items) {
        if (err) {
            errorCallback();
            return;
        }
        callback(items);
    });
}

// finds all the items that a person sold given their facebook ID
var getSoldItemsForUsers = function(userID, callback, errorCallback) {
    Item.find({
        sellerID: userID,
        sold: true
    }, function(err, items) {
        if (err) {
            errorCallback();
            return;
        }
        callback(items);
    });
}

// creates a review for a given seller given the seller's facebook ID
// the reviewers ID, the stars the gave, the review description, and the date
var createReview = function(sellerID, userID, stars, reviewDes, date) {
    User.find({
        fbid: sellerID
    }, function(err, user) {
        if (user != null) {
            if (err) throw err;
            var data = {
                userID: userID,
                stars: stars,
                reviewDes: reviewDes,
                datePosted: date
            };
            user[0].reviews.push(data);
            user[0].save();
        } else {
            console.log('Error: user is null in create review');
        }
    }, function() {
        send404(response, request);
    });
}

// adds stripes charge ID to an item given the item's ID, a user's ID, and their chargeID
var addChargeIDToItem = function(itemID, userID, chargeID) {
    Item.findById(itemID, function(err, item) {
        if (item.bids != null) {
            for (i = 0; i < item.bids.length; i++) {
                if (item.bids[i].ID == userID) {
                    item.bids[i].chargeIDs.push(chargeID);
                    item.save();
                    break;
                }
            }
        } else {
            console.log('Error, bids is null in addChargeIDToItem');
        }
    });
}

// adds a bid for an item given the itemID and the bidders facebook ID, userID, 
// and the amount they are bidding.
var addBidForItem = function(itemID, userID, newAmount, completion) {
    // get a item with ID and update the userID array
    if (userID != undefined) {
        Item.findById(itemID, function(err, item) {
            if (err) throw err;
            if (item != null) {
                var array = item.bids;
                var found = false;

                if (item.bids != null) {
                    for (i = 0; i < item.bids.length; i++) {
                        // if they already bidded on the item
                        if (item.bids[i].ID == userID) {
                            var curAmount = Number(item.bids[i].amount);
                            curAmount += Number(newAmount);
                            item.bids[i].amount = Number(curAmount);
                            item.amountRaised += Number(newAmount);
                            item.save();
                            found = true;
                            break;
                        }
                    }
                }

                if (!found) {
                    var data = {
                        ID: userID,
                        amount: newAmount,
                        chargeIDs: []
                    };
                    item.bids.push(data);

                    item.amountRaised += newAmount;
                    item.save();
                }
            } else {
                console.log('Item was null in addbidforitem')
            }


            findUser(userID, function(user) {
                if (user != null) {
                    var array = user.bids;
                    var found = 0;
                    if (user.bids != null) {
                        for (i = 0; i < user.bids.length; i++) {
                            if (user.bids[i].itemID == itemID) {
                                var curAmount = user.bids[i].amount;
                                curAmount += Number(newAmount);
                                user.bids[i].amount = curAmount;
                                user.save();
                                found = 1;
                                break;
                            }
                        }
                        if (!found) {
                            var data = {
                                itemID: itemID,
                                amount: newAmount
                            };
                            user.bids.push(data);
                            user.save();
                        }
                    }
                } else {
                    console.log('Error: user is null in addBidForItem');
                }
                completion(true);
            }, function() {
                console.log('Error: user is null in addBidForItem');
                completion(false);
            });
        });
    } else {
        console.log('Error: User is not defined');
    }
}

//Removes a bid from item for userID
var removeBidForItem = function(itemID, userID, newAmount, completion) {
    // get a item with ID and update the userID array
    if (userID != undefined) {
        Item.findById(itemID, function(err, item) {
            if (err) {
                console.log('Error finding item');
            }

            //Find the bid on the item and remove newAmount from it
            if (item != null) {
                var array = item.bids;

                if (item.bids != null) {
                    for (i = 0; i < item.bids.length; i++) {
                        // if they already bidded on the item
                        if (item.bids[i].ID == userID) {
                            var curAmount = Number(item.bids[i].amount);
                            curAmount -= Number(newAmount);
                            item.bids[i].amount = Number(curAmount);
                            item.amountRaised -= Number(newAmount);
                            item.save();
                            break;
                        }
                    }
                }
            } else {
                console.log('Item was null in removeBidForItem')
            }

            //Find the user's bid on the item and remove newAmount from it
            findUser(userID, function(user) {
                if (user != null) {
                    var found = false;
                    for (i = 0; i < user.bids.length; i++) {
                        if (user.bids[i].itemID == itemID) {
                            var curAmount = user.bids[i].amount;
                            curAmount -= Number(newAmount);
                            user.bids[i].amount = curAmount;
                            user.save();
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        console.log("Error: bid to be removed not found");
                    }
                } else {
                    console.log('Error: user is null in removeBidForItem');
                }
                completion(true);
            }, function() {
                console.log('Error: user is null in removeBidForItem');
                completion(false);
            });
        });
    } else {
        console.log('Error: User is not defined');
    }
}


// remove a user given their faceboook ID
var deleteUser = function(id, callback) {
    // Remove User
    User.find({
        fbid: id
    }, function(err, user) {
        // if (err) throw err;
        if (err) console.log(err);
        if (user != null) {
            // delete
            user[0].remove({}, function(err) {
                // if (err) throw err;
                if (err) console.log(err);
                // removes all its corresponding items
                Item.remove({
                    sellerID: id
                }, function(err) {
                    if (err) throw err;
                    callback('User successfully deleted')
                });
            });
        } else {
            callback('User not successfully deleted')
            console.log('User not successfully deleted')
        }
    });
}


// delete an item given their itemID
var deleteItem = function(id, callback) {

    // Remove Item
    Item.findById(id, function(err, item) {
        //TODO: Need to replace this error by an error callback
        if (err) throw err;

        if (item != null) {
            //delete the bid from the users bids
            findAllUsers(function(users) {
                // if no one has bid on the item
                if (item.bids.length != 0) {
                    lotteryModule.refundUsers(item);
                    //iterate through users (one time) to delete the necessary bids
                    for (var j = 0; j < users.length; j++) {
                        var user = users[j];
                        //check if user bid on item
                        for (var i = 0; i < item.bids.length; i++) {
                            var userID = item.bids[i].ID
                                //if user bid on the item, remove the bid
                            if (user.fbid == userID) {
                                for (var k = 0; k < user.bids.length; k++) {
                                    var bid = user.bids[k];
                                    if (bid.itemID == id) {
                                        user.bids.splice(k, 1);
                                        user.save();
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
                //Delete the item
                callback("1");
                item.remove(function(err) {
                    if (err) {
                        console.log('Error: removing item');
                    }
                });
            });
        } else {
            console.log('Error: Trying to remove null item');
        }

    });
}

// find a user given their facebook ID 
var findUser = function(fbid, callback, errorCallback) {
    // get all the users
    User.find({
        fbid: fbid
    }, function(err, user) {
        if (err) {
            console.log('Error: finding user');
            errorCallback();
            return;
        }
        // if (err) throw err;
        if (user.length != 0) {
            callback(user[0]);
        } else {
            console.log('Error: returning null when searching for: ' + fbid);
            errorCallback();
            return;
        }

    });
}

// find all users
var findAllUsers = function(callback) {
    // get all the users
    User.find({}, function(err, users) {
        if (err) {
            console.log("Error finding user");
        }
        callback(users)
    });
}

// delete all the users
var deleteAllUsers = function() {
    // get all the users
    User.remove({}, function(err) {
        if (err) {
            console.log('Error: removing user');
        }
    });
}

// delete all the items
var deleteAllItems = function() {
    // get all the users
    Item.remove({}, function(err) {
        if (err) {
            console.log("Error removing item");
        }
    });
}

// find an Item by its ID
var findItemByID = function(id, callback, errorCallback) {
    // get all the Items
    Item.findById(id, function(err, item) {
        if (err) {
            errorCallback()
            return;
        } else if (item == null) {
            errorCallback();
            return;
        }
        callback(item)
    });
}

// find all the Items
var findAllItems = function(callback) {
    // get all the items
    Item.find({}, function(err, items) {
        if (err) {
            console.log("Error finding item");
        }
        callback(items)
    });

}

// edit the item ?? i thought we got rid of this functionality 
var editItem = function(title, price, expirationDate, shortDescription, longDescription, itemID, image) {

    Item.findById(itemID, function(err, item) {
        item.title = title;
        item.price = price;
        item.expirationDate = expirationDate;
        item.shortDescription = shortDescription;
        item.longDescription = longDescription;
        item.image = image;
        item.save(function(err) {
            if (err) {
                console.log("Error finding item");
            }
        });
    });
}

// create an Image
var createImage = function(id, buffer) {
    Jimp.read(buffer, function(err, img) {
        img.scaleToFit(1000, 1000).getBase64(Jimp.AUTO, function(err, src) {
            var newImage = new Image({
                itemID: id,
                img: {
                    data: src
                }
            });
            // call the built-in save method to save to the database
            newImage.save(function(err) {
                if (err) {
                    console.log("Image saved successfully");
                }
            });
        });
    });
}

// find an image by its ID
var findImageByID = function(id, callback, errorCallback) {
    Image.find({
        itemID: id
    }, function(err, images) {
        if (err) {
            errorCallback();
            return;
        }
        if (images == null || images.length == 0) {
            errorCallback();
            return;
        }
        if (images != null) {
            image = images[0]
            callback(image.img.data);
            return;
        }

    })

}

// find all images
var findAllImages = function(callback) {
    Image.find({}, function(err, items) {
        if (err) {
            console.log('Error: finding images')
        }
        callback(items)
    });
}

// delete all images
var deleteAllImages = function() {
    // get all the users

    Image.remove({}, function(err) {
        if (err) {
            console.log('Error removing image');
        }
    });

}

//START EXPORTS FOR DATABASE MODULE
exports.findAllItems = function(callback) {
    findAllItems(callback);
}

exports.findUser = function(fbid, callback, errorCallback) {
    findUser(fbid, callback, errorCallback);
}

//END EXPORTS FOR DATABASE MODULE