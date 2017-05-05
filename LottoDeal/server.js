/* SERVER FUNCTIONALITY */
var express = require('express')
var app = express()
var https = require('https')
var fs = require('fs')

var json = require('express-json')
var bodyParser = require("body-parser")
app.use(bodyParser.urlencoded({
    extended: false
}));

const suggestionsModule = require('./cytoCode');
const lotteryModule = require('./lottery');
const databaseModule = require('./server');

// SHOULD GET THIS TO WORK
// var sharp = require("sharp");

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



var options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt')
};

app.use(function(req, res, next) {
    var allowedOrigins = ['https://dominicwhyte.github.io'];
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
        var reviewerID = request.body.reviewerID;
        var stars = request.body.stars;
        var reviewDes = request.body.reviewDes;
        var date = new Date();

        console.log(date)
        if (sellerID != reviewerID && reviewerID != undefined) {

            createReview(sellerID, reviewerID, stars, reviewDes, date);

            response.send("review added!")
        } else {
            response.send("You can't review yourself!")
        }
    })
    // Stripe Code---------------------------------------------------------
var stripe = require("stripe")("sk_test_eg2HQcx67oK4rz5G57XiWXgG");

// A user has bid on an item, add this bid to database
app.post('/performPaymentAndAddBid', function(request, response) {
    var accessToken = request.body["accessToken"];
    validateAccessToken(accessToken, response, request, function(userID) {
        // get into database, access object, update it's bid field and add to user bids
        var amountToCharge = request.body.amount;
        console.log('Payment performing for ' + amountToCharge + " USD")

        var token = request.body.stripeToken; // Using Express
        // Charge the user's card:
        var charge = stripe.charges.create({
            amount: amountToCharge * 100, //in cents
            currency: "usd",
            description: "Charge for LottoDeal " + request.body.itemTitle,
            source: token,
        }, function(err, charge) {

            dollarAmount = (charge.amount / 100);

            if (err != null) {
                console.log(err);
            }
            if (charge != null) {
                var itemID = request.body.itemID;
                var date = new Date();
                addBidForItem(itemID, userID, amountToCharge, charge.id);
                addNotificationToUser(itemID, userID, "New Bid", "You just bid $" + Number(dollarAmount).toFixed(2), date);
                response.send("charge is" + charge.amount)
            } else {
                console.log('Error: charge is null in performPaymentAndAddBid');
            }
        });
    });
})


//End Stripe Code ------------------------------------------------------

//START USER AUTHENTICATION CODE

var httprequest = require("request");

//Validates an access token. Provide response and request in case a 404 
//error should be thrown
function validateAccessToken(accessToken, response, request, callback) {
    console.log('Validating access Token: ' + accessToken);
    httprequest({
        uri: "https://graph.facebook.com/me?access_token=" + accessToken,
        method: "GET",
        timeout: 10000,
        followRedirect: true,
        maxRedirects: 10
    }, function(error, validateResponse, body) {
        console.log('accessToken response: ' + validateResponse);
        console.log('accessToken body: ' + body);
        body = JSON.parse(body);
        var userID = body.id;

        if (error != null || userID == null) {
            console.log('Error in validating accessToken. Error is not null or userID is null: ' + error);
            send404(response, request);
        } else {
            callback(userID);
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
            console.log("this is the user's reviews from User" + user.reviews)
            response.send(JSON.stringify(user.reviews));
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
                console.log(user.length + "lenght of users")

                if (user.length > 1) {
                    console.log('ERROR: multiple users with FBID')
                } else if (user.length == 1) {
                    response.send(true);
                } else {
                    console.log("returning false")
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
                        response.send(JSON.stringify(notifications));
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
                console.log("this is the user's reviews" + user)
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
            console.log("this is the user's reviews" + trimUser(user));
            response.send(JSON.stringify(trimUser(user)));
        } else {
            console.log('Error: user is null in getAccount');
        }
    }, function() {
        send404(response, request);
    });
})


app.get('/getSuggestions', function(request, response) {
    var accessToken = request.query["accessToken"];
    validateAccessToken(accessToken, response, request, function(userID) {
        findUser(userID, function(user) {
            if (user != null) {
                console.log("Returning suggestions for user");
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
    console.log('Sending 404');
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

app.get('/getNotifications', function(request, response) {
    var accessToken = request.query["accessToken"];
    validateAccessToken(accessToken, response, request, function(userID) {
        getNotificationsForUsers(userID, function(notifications) {
            if (notifications != null) {
                console.log('notifications = ' + JSON.stringify(notifications))
                response.send(JSON.stringify(notifications));
            } else {
                console.log('Error: notifications is null in getNotifications');
            }
        });
    });
})

app.get('/getBidsofUsers', function(request, response) {
    var userID = request.query["userID"];
    getBidsForUsers(userID, function(bids) {
        if (bids != null) {
            console.log('bids = ' + JSON.stringify(bids))
            response.send(JSON.stringify(bids));
        } else {
            console.log('Error: bids is null in getBidsofUsers');
        }

    });
})


app.get('/getBiddedItemsofUsers', function(request, response) {
    var userID = request.query["userID"];
    getItemsForUsers(userID, function(items) {
        if (items != null) {
            console.log("items you're bidding on = " + JSON.stringify(trimItems(items)));
            response.send(JSON.stringify(trimItems(items)));
        } else {
            console.log('Error: items is null in getBiddedItemsofUsers');
        }
    });
})


app.get('/getListedItemsForUsers', function(request, response) {

    var userID = request.query["userID"];
    console.log(userID);
    console.log("fetching listed itemSchema")
    getListedItemsForUsers(userID, function(items) {
        if (items != null) {
            console.log("fetching listed itemSchema")
            console.log("selling items = " + JSON.stringify(trimItems(items)));
            response.send(JSON.stringify(trimItems(items)));
        } else {
            console.log('Error: items is null in getListedItemsForUsers');
        }

    }, function() {
        send404(response, request);
    });
})


app.get('/getSoldItemsForUsers', function(request, response) {

    var userID = request.query["userID"];
    console.log(userID);
    console.log("fetching sold itemSchema")
    getSoldItemsForUsers(userID, function(items) {
        console.log("fetching sold itemSchema")
        console.log("sold items = " + JSON.stringify(items));
        response.send(JSON.stringify(trimItems(items)));
    }, function() {
        send404(response, request);
    });
})



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
                console.log(err);
                console.log("Creating your debug item!");
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
                }, imageData);
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
    var sellerID = req.body.userID;


    if (title == null || price == null || offset == null || shortDescription == null || longDescription == null || sellerID == null) {
        res.redirect("https://dominicwhyte.github.io/LottoDeal-Frontend/sell.html#!/?value=improperFormat")
        return;
    }

    if (title.length > 100 || price > 1000000000 || (offset < 0 || offset > 3) || shortDescription.length > 200 || longDescription.length > 2000) {
        res.redirect("https://dominicwhyte.github.io/LottoDeal-Frontend/sell.html#!/?value=improperFormat")
        return;
    }
    if (title.length < 0 || price < 1 || shortDescription.length < 0 || longDescription.length < 0) {
        res.redirect("https://dominicwhyte.github.io/LottoDeal-Frontend/sell.html#!/?value=improperFormat")
        return;
    }

    var picture = req.files['picture'][0]

    // console.log("printing picture");
    // console.log(picture);

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
        console.log("Removing created image from /uploads")
        if (error != null) {
            console.log(error);
        }
    })

    // create compressed version
    Jimp.read(imageData, function(err, img) {
        console.log(err);
        console.log(img);
        img.scaleToFit(500, 500) // crop(100, 100, 300, 200) // CAN EDIT THE SCALING HERE TO BE A LITTLE SMALLER FOR PERFORMANCE
            .write(imagePath + picture.filename + "compressed").getBase64(Jimp.AUTO, function(err, src) {
                console.log("here");
                console.log(err);
                // console.log(response);
                // console.log(src);
                // if (err != null) {
                console.log("working");
                image["compressed"] = src;
                // }

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
                    expirationDate.setSeconds(expirationDate.getSeconds() + 10);
                }
                var shortDescription = req.body.shortDescription;
                var longDescription = req.body.longDescription;
                var sellerID = req.body.userID;
                console.log(image);

                createItem(title, price, date, expirationDate, shortDescription, longDescription, sellerID, image, function(id) {
                    res.redirect('https://dominicwhyte.github.io/LottoDeal-Frontend/sell.html#!/?value=success&id=' + id);
                }, function() {
                    send404(res, req);
                }, imageData);
            })
    })
})


// Will add a new user to our database
app.post('/createUser', function(request, response) {
    // Parse the response
    console.log(request.body);
    var name = request.body.name;
    var id = request.body.fbid;
    var url = request.body.url;
    var email = request.body.email;
    var age = request.body.age;
    var gender = request.body.gender;
    console.log("Age and gender: " + age + " " + gender);

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
    // Parse the response
    console.log(request.body);
    var email = request.body.email;
    var userID = request.body.userID;

    findUser(userID, function(user) {
        if (user != null) {
            user.email = email;
            user.save();
            console.log("here's your new email" + user.email)
            response.send("updated settings");
        } else {
            console.log("Failed to update settings");
            response.send("Failed to update settings");
        }

    }, function() {
        send404(response, request);
    });

})


// Send back all posts
app.get('/getPosts', function(request, response) {
    // get all of the posts and return them to frontend to load on feed
    // might not need to include bids
    // console.log(request);

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


    var accounts = [];
    var items = findAllItems(function(items) {
        if (items != null) {
            findAllUsers(function(users) {
                if (users != null) {
                    for (var i = 0; i < items.length; i++) {
                        console.log(items.length)
                        var item = items[i];
                        var sellerID = item.sellerID;
                        for (var j = 0; j < users.length; j++) {
                            var user = users[j]
                            if (sellerID == user.fbid) {
                                if (user.reviews != null) {

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
                    }

                    response.send(JSON.stringify(accounts))
                } else {
                    console.log("Error: Users null");
                }
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
                // console.log(item);
                item.img.compressed = buffer;
                console.log("printing item");
                // console.log(item);
                console.log(buffer);
                response.send(JSON.stringify(trimItem(item)));
            }, function() {
                send404(response, request);
            })

            // response.send(JSON.stringify(item));
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
    // console.log(request.body);
    // console.log(request);
    var id = request.body.id;

    deleteUser(id, function(message) {
            response.send(message);
        })
        // response.send('Deleted')
})


// Delete an Item
app.delete('/deleteItem', function(request, response) {
    var accessToken = request.body.accessToken;
    var itemIDToDelete = request.body.id
    validateAccessToken(accessToken, response, request, function(userID) {
        findUser(userID, function(user) {
            if (user != null) {
                response.header('Access-Control-Allow-Methods', 'DELETE');
                //Check that the user has the right to delete this item
                var userCanDeleteItem = false;
                for (var i = 0; i < user.bids.length; i++) {
                    if (itemIDToDelete == user.bids[i].itemID) {
                        userCanDeleteItem = true;
                        break;
                    }
                }
                if (userCanDeleteItem) {
                    deleteItem(itemIDToDelete, function(message) {
                        response.send(message);
                    });
                } else {
                    send404(response, request);
                }

            } else {
                console.log('Error: user is null in getAccount');
                send404(response, request);
            }
        }, function() {
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
            console.log("here are all your images" + items)
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



https.createServer(options, app).listen(8000, function() {
    console.log("Server started at port 8000");
});



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
    assert.equal(null, err);


    var postmark = require("postmark");

    // // Example request
    //     var client = new postmark.Client("27c10544-6caa-46b9-8640-67b000036be3");

    //     client.sendEmail({
    //         "From": "dwhyte@princeton.edu",
    //         "To": "whyte42@gmail.com",
    //         "Subject": "Test", 
    //         "TextBody": "Hello from Postmark!"
    //     });



    //deleteAllUsers();
    // deleteAllItems();
    // deleteAllImages();


    //findAllUsers();
    console.log("Connected successfully to server");

    // deleteItem('590267c9be88c312ba3d5d8a', function(result) {
    //     console.log(result);
    //     console.log('deleted');
    // });

    //addBidForItem("58efe4435363382e3d61137a", "58e8054642a9960421d3a566", 3);
    // var date = new Date();

    findAllUsers(function(users) {
        console.log(users)
            // if (users.length != 0) {
            //     console.log('Computing similarity for: ' + users[0].fullName);
            //     suggestionsModule.computeSimilarities(users[0].fbid, User, Item); 
            // }
    });

    // User.find({fbid: 1467343223328608}, function(err, user) {
    //     if (err) throw err;
    //     // object of all the users

    //     data = {
    //         userID : "Dom",
    //         stars : 100,
    //         reviewDes : "supaa good",
    //     };
    //     user[0].reviews.push(data);
    //     user[0].save();
    // });

    findAllItems(function(items) {
        // console.log(items);
        //console.log('initiating refunds');
        // for (var i = 0; i < items.length; i++) {
        //     refundUsers(items[i]);
        // }
    });

    findAllImages(function(images) {
        // console.log(images)
    })

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
        itemID: String,
        amount: Number
    }], //Bid object as dictionary containing all current bids of that user (indexed by itemID).  If a person bids twice on an item, the bid for that itemID is increased (Dictionary)
    reviews: [{ // reviews on sellers
        userID: String,
        stars: Number,
        reviewDes: String,
        datePosted: Date, //date the review was created (String - parse into Date object)
    }],
    userInfo: {
        age: Number,
        gender: String
    },
    notifications: [{ // notifications to show user
        read: Boolean,
        title: String,
        description: String,
        datePosted: Date, //date the notification was created (String - parse into Date object)
        itemID: String, // item associated with the notification
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
        ID: String,
        amount: Number,
        chargeIDs: [String] ////charge ID, in case refund should be issued
    }], //Dictionary of fbid’s of users who have placed bids (Dictionary)
    shortDescription: String, // text string of what exactly is being sold (String)
    longDescription: String,
    img: {
        data: Buffer, // stores an image here
        compressed: String,
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
    itemID: String,
    img: {
        data: String,
    }
})

var Image = mongoose.model('Image', imageSchema);



module.exports = User;
module.exports = Item;
module.exports = Image;


var createUser = function(name, id, url, email, age, gender) {
    if (age == null || isNaN(age)) {
        age = 25
    }
    if (gender == null) {
        gender = ""
    }
    console.log(name)
    console.log(id)
    console.log(url)
    console.log(email)
    console.log(age)

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
        if (err) throw err;
        console.log('User saved successfully!');
    });
}


var createItem = function(title, price, datePosted, expirationDate, shortDescription, longDescription, sellerID, picture, callback, errorCallback, buffer) {
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
                console.log("Here is the new item");

                console.log(newItem["_id"])

                createImage(newItem["_id"], buffer);

                callback(newItem["_id"])
            });
            newItem.save(function(err) {
                if (err) throw err;

                console.log('Item saved successfully');
            });
        } else {
            console.log('Item saved unsuccessfully');
        }
    }, function() {
        send404(response, request);
    });
}


var addNotificationToUser = function(itemID, userID, titleText, descriptionText, date) {
    User.find({
        fbid: userID
    }, function(err, user) {
        if (user.length != 1) {
            console.log('ERROR: multiple users with FBID')
        } else {
            if (err) throw err;
            var data = {

                itemID: itemID,
                datePosted: date,
                read: false,
                title: titleText,
                description: descriptionText
            };
            user[0].notifications.push(data);
            user[0].save();
        }
    });
}

var getNotificationsForUsers = function(userID, callback) {
    User.find({
        fbid: userID
    }, function(err, user) {
        if (user.length != 0) {
            console.log('Got notifications for user' + userID);
            callback(user[0].notifications);
        } else {
            callback(null);
            console.log('Error: no users');
        }
    });
}

var getBidsForUsers = function(userID, callback) {
    User.find({
        fbid: userID
    }, function(err, user) {
        console.log('Got bids for user' + userID)
        if (user.length != 0) {
            callback(user[0].bids);
        } else {
            console.log('Error: no users');
            callback(null);
        }
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
}

function trimUsers(users) {
    var trimmedUsers = []
    for (var i = 0; i < users.length; i++) {
        trimmedUsers.push(trimUser(users[i]));
    }
    return trimmedUsers;
}

function trimUser(user) {
    user.userInfo = null;
    user.notifications = null;
    user.bids = null;
}


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
                console.log("here are all your items" + items)
                callback(items);
            });
        } else {
            console.log('Error: user array is empty');
            callback(null);
        }
    });
}


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

app.get('/getReviewerImagesandNames', function(request, response) {
    var userID = request.query["userID"];
    var reviewersID = []
    findUser(userID, function(user) {
        if (user != null) {
            var reviews = user.reviews;
            for (var i = 0; i < reviews.length; i++) {
                reviewersID.push(reviews[i].userID);
            }
            console.log("Here are all the reviewersID IDs" + reviewersID);
            User.find({
                fbid: reviewersID
            }, function(err, reviewers) {
                console.log('got reviewers')
                var reviewersToSend = [];
                for (var i = 0; i < reviewersID.length; i++) {
                    for (var j = 0; j < reviewers.length; j++) {
                        if (reviewersID[i] == reviewers[j].fbid) {
                            reviewersToSend.push(reviewers[j]);
                            break;
                        }
                    }
                }
                console.log('got reviewers')
                response.send(reviewersToSend);
            });
        } else {
            console.log('User is null in getReviewerImagesandNames');
        }
    }, function() {
        send404(response, request);
    });
});

var createReview = function(sellerID, reviewerID, stars, reviewDes, date) {
    User.find({
        fbid: sellerID
    }, function(err, user) {
        if (user != null) {
            if (err) throw err;
            var data = {
                reviewerID: reviewerID,
                stars: stars,
                reviewDes: reviewDes,
                datePosted: date
            };
            console.log(data);
            user[0].reviews.push(data);
            user[0].save();
            console.log(user[0].reviews)
        } else {
            console.log('Error: user is null in create review');
        }
    }, function() {
        send404(response, request);
    });
}

var addBidForItem = function(itemID, userID, newAmount, chargeID) {
    // get a item with ID and update the userID array
    if (userID != undefined) {
        Item.findById(itemID, function(err, item) {
            if (err) throw err;
            if (item != null) {
                var array = item.bids;
                var found = false;

                if (item.bids != null) {
                    for (i = 0; i < item.bids.length; i++) {
                        if (item.bids[i].ID == userID) {
                            var curAmount = Number(item.bids[i].amount);
                            curAmount += Number(newAmount);
                            item.bids[i].amount = Number(curAmount);
                            item.bids[i].chargeIDs.push(chargeID);
                            console.log('pushing chargeID ' + chargeID);
                            item.amountRaised += Number(newAmount);
                            item.save();
                            found = true;
                            break;
                        }
                    }
                }

                if (!found) {
                    console.log('pushing chargeID ' + chargeID);
                    var data = {
                        ID: userID,
                        amount: newAmount,
                        chargeIDs: [chargeID]
                    };
                    console.log(data);
                    item.bids.push(data);

                    item.amountRaised += newAmount;
                    item.save();
                }

                console.log('Bid successfully added to item');
            } else {
                console.log('Item was null in addbidforitem')
            }

        });
    } else {

    }

    var users = findAllUsers(function(users) {
        var usersLength = users.length;

        for (var i = 0; i < usersLength; i++) {
            if (users[i].fbid === userID) {
                //response.send("User already exists");
                var user = users[i]
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
                        console.log(data);
                        user.bids.push(data);
                        user.save();
                    }
                    // sendEmailToAddress(user.email, "Congrats!", "You bid $" + newAmount + " on " + item.title)
                    console.log('Bid successfully added to user');
                }
                break;
            }
        }
    });
}



var deleteUser = function(id, callback) {
    // Remove User
    User.find({
        fbid: id
    }, function(err, user) {
        // if (err) throw err;
        console.log(user);
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
                    console.log('Items successfully deleted!');
                });

                // callback('User successfully deleted')
                console.log('User successfully deleted');
            });
        } else {
            callback('User not successfully deleted')
            console.log('User not successfully deleted')
        }
    });
}


var deleteItem = function(id, callback) {
    // Remove Item
    Item.findById(id, function(err, item) {
        //TODO: Need to replace this error by an error callback
        if (err) throw err;

        if (item != null) {
            //delete the bid from the users bids
            findAllUsers(function(users) {
                // if no one has bid on the item
                if (item.bids.length == 0) {
                    console.log('Deleting item with no bids');
                } else {
                    console.log('Deleting item with bids');
                    //iterate through users (one time) to delete the necessary bids
                    for (var j = 0; j < users.length; j++) {
                        var user = users[j];
                        console.log('checking user');
                        //check if user bid on item
                        for (var i = 0; i < item.bids.length; i++) {
                            var userID = item.bids[i].ID
                            console.log('UserID of a bidder is ' + userID);
                            //if user bid on the item, remove the bid
                            if (user.fbid == userID) {
                                for (var k = 0; k < user.bids.length; k++) {
                                    var bid = user.bids[k];
                                    if (bid.itemID == id) {
                                        user.bids.splice(k, 1);
                                        user.save();
                                        console.log('Removing bid from user');
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
                    if (err) throw err;
                    console.log('Item successfully deleted!');
                });
            });
        } else {
            console.log('Trying to remove null item');
        }

    });
}


var findUser = function(fbid, callback, errorCallback) {
    // get all the users
    User.find({
        fbid: fbid
    }, function(err, user) {
        if (err) {
            console.log('Error finding user');
            errorCallback();
            return;
        }
        // if (err) throw err;
        if (user.length != 0) {
            console.log(user[0]);
            callback(user[0]);
        } else {
            console.log('returning null when searching for: ' + fbid);
            // SHOULD REALLY TRY AND FIX THIS! - make sure this doesn't crash anything else
            // MAYBE NOT THE BEST IMPLEMENTATION? should it always return null?
            errorCallback();
            return;
        }

    });
}

var findAllUsers = function(callback) {
    // get all the users
    User.find({}, function(err, users) {
        if (err) throw err;
        callback(users)
    });
}

var deleteAllUsers = function() {
    // get all the users
    User.remove({}, function(err) {
        if (err) throw err;
        console.log('All Uses successfully deleted!');
    });
}

var deleteAllItems = function() {
    // get all the users
    Item.remove({}, function(err) {
        if (err) throw err;
        console.log('All Items successfully deleted!');
    });
}


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


var findAllItems = function(callback) {
    // get all the items
    Item.find({}, function(err, items) {
        if (err) throw err;
        callback(items)
    });

}

var editItem = function(title, price, expirationDate, shortDescription, longDescription, itemID, image) {

    Item.findById(itemID, function(err, item) {
        item.title = title;
        item.price = price;
        item.expirationDate = expirationDate;
        item.shortDescription = shortDescription;
        item.longDescription = longDescription;
        item.image = image;
        item.save(function(err) {
            if (err) throw err;
            console.log('Item updated successfully');
        });
    });
}


var createImage = function(id, buffer) {
    Jimp.read(buffer, function(err, img) {
        // console.log(err);
        // console.log(img);
        img.scaleToFit(1000, 1000).getBase64(Jimp.AUTO, function(err, src) {
            // console.log(src);
            var newImage = new Image({
                itemID: id,
                img: {
                    data: src
                }
            });
            // console.log(newImage);

            // call the built-in save method to save to the database
            newImage.save(function(err) {
                if (err) throw err;
                console.log('Image saved successfully!');
            });
        });
    });
}

var findImageByID = function(id, callback, errorCallback) {
    console.log(id);
    Image.find({
        itemID: id
    }, function(err, images) {
        // console.log(images);
        if (err) {
            errorCallback();
            return;
        }
        if (images == null || images.length == 0) {
            console.log("here")
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

var findAllImages = function(callback) {
    Image.find({}, function(err, items) {
        if (err) throw err;
        //console.log(items);
        callback(items)
    });
}

var deleteAllImages = function() {
    // get all the users

    Image.remove({}, function(err) {
        if (err) throw err;
        console.log('All Images successfully deleted!');
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