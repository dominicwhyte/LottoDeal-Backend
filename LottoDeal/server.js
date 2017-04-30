/* SERVER FUNCTIONALITY */
var express = require('express')
var app = express()
var https = require('https')
var fs = require('fs')
const SECONDS_UNTIL_CHECK_FOR_PERFROMING_LOTTERIES = 3;
var json = require('express-json')
var bodyParser = require("body-parser")
app.use(bodyParser.urlencoded({
    extended: false
}));


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


var helmet = require("helmet")
app.use(helmet())

var fs = require('fs'); // add for file system
// app.get('/',function(req,res){
// fs.readFile('index.html',function (err, data){
//     res.writeHead(200, {'Content-Type': 'text/html','Content-Length':data.length});
//     res.write(data);
//     res.end();
// });

// });


//Check if lotteries should be performed
function checkIfServerShouldPerformLottery() {
    // do whatever you like here
    // console.log('Checking if lottery should be performed')
    checkLotteries();
    setTimeout(checkIfServerShouldPerformLottery, SECONDS_UNTIL_CHECK_FOR_PERFROMING_LOTTERIES * 1000);
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
        console.log(response.statusCode);
        console.log(response.body);
        console.log(response.headers);
    })
}

//app.use(express.bodyParser());

var options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt')
};

app.use(function(req, res, next) {
    var allowedOrigins = ['https://dominicwhyte.github.io'];
    var origin = req.headers.origin;
    console.log("printing origin");
    console.log(origin);
    if (allowedOrigins.indexOf(origin) > -1) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.header('Access-Control-Allow-Credentials', true);
        return next();
    } else {
        res.send("Oops! You can't access our API")
    }
    //res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:8020');
    // res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, DELETE');
    // res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // res.header('Access-Control-Allow-Credentials', true);
    // return next();
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

    createReview(sellerID, reviewerID, stars, reviewDes, date);

    response.send("review added!")
})

// Stripe Code---------------------------------------------------------

// A user has bid on an item, add this bid to database
app.post('/performPaymentAndAddBid', function(request, response) {
    // get into database, access object, update it's bid field and add to user bids
    var amountToCharge = request.body.amount;
    console.log('Payment performing for ' + amountToCharge + " USD")
    var stripe = require("stripe")("sk_test_eg2HQcx67oK4rz5G57XiWXgG");

    var token = request.body.stripeToken; // Using Express
    // Charge the user's card:
    var charge = stripe.charges.create({
        amount: amountToCharge * 100, //in cents
        currency: "usd",
        description: "Charge for LottoDeal " + request.body.itemTitle,
        source: token,
    }, function(err, charge) {

        if (err != null) {
            console.log(err);
        }
        if (charge != null) {
            var itemID = request.body.itemID;
            var userID = request.body.userID;
            var date = new Date();
            addBidForItem(itemID, userID, amountToCharge, charge.id);
            addNotificationToUser(itemID, userID, "New Bid", "You just bid " + charge.amount + " dollar(s)", date);
            response.send("charge is" + charge.amount)
        } else {
            console.log('Error: charge is null in performPaymentAndAddBid');
        }
    });
})


//End Stripe Code ------------------------------------------------------

// Send back the reviews on the passed in item parameter, in case user wants to
// see the people that bid on his item
app.get('/getReviews', function(request, response) {

    var sellerID = request.query["sellerID"];
    console.log("this is the request" + request.body);
    findUser(sellerID, function(user) {
        if (user != null) {
            console.log("this is the user's reviews" + user)
            response.send(JSON.stringify(user.reviews));
        } else {
            console.log('Error: user is null in getReviews');
        }
    }, function() {
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
    });
})


// mark all notifications read
app.get('/markRead', function(request, response) {
    var userID = request.query["userID"];

    findUser(userID, function(user) {
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
    }, function() {
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
    });

})


app.get('/getAccount', function(request, response) {
    var userID = request.query["userID"];
    findUser(userID, function(user) {
        if (user != null) {
            console.log("this is the user's reviews" + user)
            response.send(JSON.stringify(user));
        } else {
            console.log('Error: user is null in getAccount');
        }
    }, function() {
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
    });
})



app.get('/getNotifications', function(request, response) {
    console.log('getting notifications');
    // var userID = '1641988472497790';
    // console.log(request)
    // console.log(request.body);
    var userID = request.query["userID"];

    getNotificationsForUsers(userID, function(notifications) {
        if (notifications != null) {
            console.log('notifications = ' + JSON.stringify(notifications))
            response.send(JSON.stringify(notifications));
        } else {
            console.log('Error: notifications is null in getNotifications');
        }

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
            console.log("items you're bidding on = " + JSON.stringify(items));
            response.send(JSON.stringify(items));
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
            console.log("selling items = " + JSON.stringify(items));
            response.send(JSON.stringify(items));
        } else {
            console.log('Error: items is null in getListedItemsForUsers');
        }

    }, function() {
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
    });
})


app.get('/getSoldItemsForUsers', function(request, response) {

    var userID = request.query["userID"];
    console.log(userID);
    console.log("fetching sold itemSchema")
    getSoldItemsForUsers(userID, function(items) {
        console.log("fetching sold itemSchema")
        console.log("sold items = " + JSON.stringify(items));
        response.send(JSON.stringify(items));
    }, function() {
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

    // console.log('test');
    // console.log(req.body);
    // console.log('test');
    // req.files is an object (String -> Array) where fieldname is the key, and the value is array of files
    //
    // e.g.
    //  req.files['avatar'][0] -> File
    //  req.files['gallery'] -> Array
    //
    // req.body will contain the text fields, if there were any
    // console.log(req)
    // console.log(req.files)
    // console.log(req.body)
    // img: {data: Buffer, // stores an image here
    //         contentType: String},
    // image

    // console.log(req.files['picture'][0])
    // CHECK FOR SIZE OF IMAGE
    var imgSize = req.files['picture'][0].size;
    if (imgSize > maxSize) {
        res.redirect('https://dominicwhyte.github.io/LottoDeal-Frontend/sell.html#!/?value=sizeTooLarge');
    }

    var picture = req.files['picture'][0]
    var imagePath = "./uploads/" + picture.filename;
    var imageData = fs.readFileSync(imagePath);
    var image = {}
        // image["data"] = imageData
    image["contentType"] = 'image/png';



    // create compressed version
    Jimp.read(imagePath, function(err, img) {
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
                } else {
                    expirationDate.setDate(date.getDate() + 30);
                }
                var shortDescription = req.body.shortDescription;
                var longDescription = req.body.longDescription;
                var sellerID = req.body.userID;
                console.log(image);

                createItem(title, price, date, expirationDate, shortDescription, longDescription, sellerID, image, function(id) {
                    res.redirect('https://dominicwhyte.github.io/LottoDeal-Frontend/sell.html#!/?value=success&id=' + id);
                }, function() {
                    res.status(404);

                    // respond with html page
                    if (req.accepts('html')) {
                        // CAN DO RESPONSE.RENDER HERE
                        res.sendFile(__dirname + "/views/404.html", {
                            url: req.url
                        });
                        return;
                    }
                    // respond with json
                    if (req.accepts('json')) {
                        res.send({
                            error: 'Not found'
                        });
                        return;
                    }

                    // default to plain-text. send()
                    res.type('txt').send('Not found');
                }, imageData);
            })
    })

    // Jimp.read(imagePath + "compressed", function(err, image) {
    // 	console.log(err);
    // 	console.log(image);
    // 	image.getBuffer(Jimp.AUTO, function(response) {
    // 		console.log(response);
    // 	})
    // })


    // console.log(image)
    // var title = req.body.title;
    // var price = req.body.price;
    // var offset = req.body.expirDate;
    // var expirationDate = new Date()
    // var date = new Date();

    // if (offset == 1) {
    //     expirationDate.setDate(date.getDate() + 1);
    // } else if (offset == 2) {
    //     expirationDate.setDate(date.getDate() + 7);
    // } else {
    //     expirationDate.setDate(date.getDate() + 30);
    // }
    // var shortDescription = req.body.shortDescription;
    // var longDescription = req.body.longDescription;
    // var sellerID = req.body.userID;

    // createItem(title, price, date, expirationDate, shortDescription, longDescription, sellerID, image, function(id) {
    //     res.redirect('https://dominicwhyte.github.io/LottoDeal-Frontend/sell.html#!/?value=success&id=' + id);
    // }, function() {
    //     response.status(404);

    //     // respond with html page
    //     if (request.accepts('html')) {
    //         // CAN DO RESPONSE.RENDER HERE
    //         response.sendFile(__dirname + "/views/404.html", {
    //             url: request.url
    //         });
    //         return;
    //     }
    //     // respond with json
    //     if (request.accepts('json')) {
    //         response.send({
    //             error: 'Not found'
    //         });
    //         return;
    //     }

    //     // default to plain-text. send()
    //     response.type('txt').send('Not found');
    // });

    // res.redirect('https://dominicwhyte.github.io/LottoDeal-Frontend/sell.html#!/?value=success&id=');
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
    });

})

// A user has bid on an item, add this bid to database
// app.post('/addBid', function(request, response) {
//     // get into database, access object, update it's bid field and add to user bids

//     var itemID = request.body.itemID;
//     var userID = request.body.userID;
//     var newAmount = request.body.newAmount;

//     addBidForItem(itemID, userID, newAmount);
//     addNotificationToUser(userID, "New Bid", "You just bid " + newAmount + " dollar(s)");

//     response.send("Bid added")
// })

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
                response.send(JSON.stringify(item))
            }, function() {
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
            })

            // response.send(JSON.stringify(item));
        } else {
            console.log("Error: item is null in getItem");
        }

    }, function() {
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
    // console.log(request.body);
    // console.log(request);
    var id = request.body.id;

    console.log("here");

    response.header('Access-Control-Allow-Methods', 'DELETE');


    deleteItem(id, function(message) {
            response.send(message);
        })
        // response.send('Deleted')
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


// Send back the bids on the passed in item parameter, in case user wants to
// see the people that bid on his item
// app.get('/getBids', function(request, response) {
//     response.send("Here are all of the bids on this item")

//     var title = request.body.title;
//     var item = findItem(title);

// })

// Start the server at localhost:8000
//app.listen(8000, function() {
//   console.log("App is listening on port 8000")
//})

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


    // deleteAllUsers();
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
        if (users.length != 0) {
            computeSimilarities(users[0].fbid);

        }
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
        console.log(items);
        //console.log('initiating refunds');
        // for (var i = 0; i < items.length; i++) {
        //     refundUsers(items[i]);
        // }
    });

    findAllImages(function(images) {
        // console.log(images)
    })

    checkIfServerShouldPerformLottery();
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
                    // console.log(newItem);
            });

            newItem.save(function(err) {
                if (err) throw err;

                console.log('Item saved successfully');
            });
        } else {
            console.log('Item saved unsuccessfully');
        }


    }, function() {
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
    });
    // call the built-in save method to save to the database
    // newItem.img.data = fs.readFileSync(image);
    // newItem.img.contentType = 'image/png';    
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
    });
});


var createReview = function(sellerID, reviewerID, stars, reviewDes, date) {
    User.find({
        fbid: sellerID
    }, function(err, user) {
        if (user != null) {
            if (err) throw err;
            var data = {
                userID: reviewerID,
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


    });
}


//Check database for if lotteries should be performed
var checkLotteries = function() {
    Item.find({}, function(err, items) {
        if (err) throw err;

        for (i = 0; i < items.length; i++) {
            var item = items[i]
            if (item.expired || item.sold) {
                continue;
            }
            var expirDate = new Date(item.expirationDate)
            if (item.amountRaised >= item.price) {
                var winner = performLottery(item);
                console.log('Item sold to ' + winner)
                emailBiddersForItem(item, "LottoDeal: You lost!", "Sorry, you lost your bid for " + item.title + ". Bid again on LottoDeal!", winner)
            } else if (expirDate < Date.now()) {
                //Refund and notify users
                refundUsers(item);
                console.log('Date has past - notifying users and marking item as expired');

                emailBiddersForItem(item, "LottoDeal:" + item.title + " expired", "You have been fully refunded", "");
                item.expired = true;
                item.save();
            } else {
                // console.log('Item checked - no changes')
            }
        }
    });
}

function refundUsers(item) {
    for (var j = 0; j < item.bids.length; j++) {
        console.log('attempting to refund user');
        var bid = item.bids[j];
        for (var i = 0; i < bid.chargeIDs.length; i++) {
            console.log('attempt refund for charge ID');
            var chargeID = bid.chargeIDs[i];
            var stripe = require("stripe")("sk_test_eg2HQcx67oK4rz5G57XiWXgG");

            stripe.refunds.create({
                charge: chargeID,
            }, function(err, refund) {
                if (refund != null) {
                    console.log(refund.amount + " cents refunded successfully");
                } else {
                    console.log('Refund failed')
                }
            });
        }
    }
}

//do not notify the winner
function emailBiddersForItem(item, subject, message, winner) {
    for (var j = 0; j < item.bids.length; j++) {
        var bidderID = item.bids[j].ID;
        if (bidderID == winner) {
            continue;
        }
        findUser(bidderID, function(user) {
            // SHOULD COMMENT THIS BACK IN
            // sendEmailToAddress(user.email, subject, message);
        }, function() {
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
        });
    }
}

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

//returns the userID of the winner
var performLottery = function(item) {
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
        console.log('No winner - defaulting to first bidder in random array')
        if (bids.length != 0) {
            winner = shuffledBids[0].bidderID
        }
    }
    item.sold = true;
    item.winnerID = winner;
    User.find({
        fbid: winner
    }, function(err, user) {
        // if (err) throw err;
        console.log(user);
        if (err) console.log(err);
        if (user != null) {
            // get the user name
            item.winnerName = user[0].fullName;
            item.save();
            return winner;
        } else {
            console.log('User not successfully found')
            return null;
        }
    });

    // item.save();
    // return winner;
}



// A.findById(a, function (err, doc) {
//   if (err) return next(err);
//   res.contentType(doc.img.contentType);
//   res.send(doc.img.data);
//   // how to send it back to the sever from my computer

var addBidForItem = function(itemID, userID, newAmount, chargeID) {
    // get a item with ID and update the userID array
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


    // User.remove({}, function(err) {
    //     if (err) throw err;
    //     console.log('All Uses successfully deleted!');
    // });
    // User.findById(id, function(err, user) {
    //     // if (err) throw err;
    //     if (err) console.log(err);
    //     if (user != null) {
    //         // delete
    //         user.remove(function(err) {
    //             // if (err) throw err;
    //             if (err) console.log(err);
    //             callback('User successfully deleted')
    //             console.log('User successfully deleted');
    //         });
    //     } else {
    //         callback('User not successfully deleted')
    //         console.log('User not successfully deleted')
    //     }
    // });
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
            console.log('returning null');
            // SHOULD REALLY TRY AND FIX THIS! - make sure this doesn't crash anything else
            // MAYBE NOT THE BEST IMPLEMENTATION? should it always return null?
            errorCallback();
            return;
            callback(null);
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
        // object of all the users
        console.log(item);



        callback(item)
            // return item;
    });
}

var findAllItems = function(callback) {
    // get all the items
    Item.find({}, function(err, items) {
        if (err) throw err;
        //console.log(items);
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
    // call the built-in save method to save to the database
    // newItem.img.data = fs.readFileSync(image);
    // newItem.img.contentType = 'image/png';    
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
    // var newImage = new Image({
    //     itemID: id,
    //     img: {
    //     	data: buffer
    //     }
    // });

    // // call the built-in save method to save to the database
    // newImage.save(function(err) {
    //     if (err) throw err;
    //     console.log('Image saved successfully!');
    // });
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







//TEST CODE TEMPORARILY IN SERVER.JS
// CYTOSCAPE CODE

var cytoscape = require('cytoscape');



// WHEN SERVER IS RESTARTED, CYTOSCAPE SHOULD BE REINITIALIZED
var cy = cytoscape({
    //   elements: [ // list of graph elements to start with
    //     { // node a
    //       data: { id: 'a' }
    //     },
    //     { // node b
    //       data: { id: 'b' }
    //     },
    //     { // edge ab
    //       data: { id: 'ab', source: 'a', target: 'b' }
    //     }
    //   ],
});

var stringSimilarity = require('string-similarity');
var edgeWeights = {};

function computeSimilarities(userID) {
    //Retrieve users and items
    User.find({}, function(err, users) {
        if (err) {
            console.log("There was an error retrieving all items");
        } else {
            Item.find({}, function(err, items) {
                if (err) {
                    console.log("There was an error retrieving all items");
                } else {
                    if (users != null && users.length > 0 && items != null && items.length > 0) {
                        addUserVerticesAndEdges(users);
                        addItemVerticesAndEdges(items);
                        addConnectingEdges(users);
                        computeEdgeWeights(users, items);
                        console.log('Graph set up');
                        var suggestions = getSuggestedItems(userID);
                        printSuggestions(users, items, suggestions);
                    } else {
                        console.log("Oops, there are no users and/or items!");
                    }


                }
            });
        }
    });
}

// ADD VERTCES AND EDGES FOR USERS
function addUserVerticesAndEdges(users) {

    for (var i = 0; i < users.length; i++) {
        cy.add({
                group: "nodes",
                data: {
                    id: String("u" + users[i].fbid)
                }
            } // may or may not have to specify a position here (x, y)
        );
    }
    for (var i = 0; i < users.length; i++) {
        for (var j = i + 1; j < users.length; j++) {
            cy.add({
                group: "edges",
                data: {
                    id: "u" + users[i].fbid + "," + users[j].fbid,
                    source: "u" + users[i].fbid,
                    target: "u" + users[j].fbid
                }
            });
        }
    }

}

// ADD VERTICES AND EDGES FOR ITEMS
function addItemVerticesAndEdges(items) {

    for (var i = 0; i < items.length; i++) {
        cy.add({
                group: "nodes",
                data: {
                    id: String("i" + items[i]._id)
                }
            } // may or may not have to specify a position here (x, y)
        );
    }
    for (var i = 0; i < items.length; i++) {
        for (var j = i + 1; j < items.length; j++) {
            cy.add({
                group: "edges",
                data: {
                    id: "i" + items[i]._id + "," + items[j]._id,
                    source: "i" + items[i]._id,
                    target: "i" + items[j]._id
                }
            })
        }
    }

}

// ADD THE CONNECTING EDGES BETWEEN USERS AND THE ITEMS THEY HAVE BID ON
function addConnectingEdges(users) {

    for (var i = 0; i < users.length; i++) {
        for (var j = 0; j < users[i].bids.length; j++) {
            cy.add({
                group: "edges",
                data: {
                    id: "c" + users[i].fbid + "," + users[i].bids[j].itemID,
                    source: "u" + users[i].fbid,
                    target: "i" + users[i].bids[j].itemID
                }
            });
            edgeWeights["c" + users[i].fbid + "," + users[i].bids[j].itemID] = users[i].bids[j].amount;
        }
    }
}

var ITEM_SIMILARITY_MULTIPLIER = 3
var USER_GENDER_DISPARITY_MULTIPLIER = 2

// COMPUTE THE EDGE WEIGHTS
function computeEdgeWeights(users, items) {

    // ADD EDGE WEIGHTS FOR USERS
    for (var i = 0; i < users.length; i++) {
        for (var j = i + 1; j < users.length; j++) {
            var similarity = Math.abs(users[i].userInfo.age - users[j].userInfo.age); //  COMPARE THE USERS HERE
            if (users[i].userInfo.gender == users[j].userInfo.gender) {
                similarity = similarity; // keep it the same?
                edge = "u" + users[i].fbid + "," + users[j].fbid;
                edgeWeights[edge] = similarity;
            } else {
                similarity += 1; // in case difference in age was 0
                similarity *= USER_GENDER_DISPARITY_MULTIPLIER; // 
                edge = "u" + users[i].fbid + "," + users[j].fbid;
                edgeWeights[edge] = similarity;
            }
        }
    }
    // ADD EDGE WEIGHTS FOR ITEMS
    for (var i = 0; i < items.length; i++) {
        for (var j = i + 1; j < items.length; j++) {
            var similarity = 1 - stringSimilarity.compareTwoStrings(items[i].title, items[j].title);
            similarity += 1 - stringSimilarity.compareTwoStrings(items[i].shortDescription, items[j].shortDescription);
            similarity += 1 - stringSimilarity.compareTwoStrings(items[i].longDescription, items[j].longDescription);
            similarity *= ITEM_SIMILARITY_MULTIPLIER // mult
            edge = "i" + items[i]._id + "," + items[j]._id;
            // should the edge going the other way be added too?
            edgeWeights[edge] = similarity;
        }
    }
}

//Compute the shortest paths for user_fbid
function getSuggestedItems(user_fbid) {
    // console.log("Edges: ");
    // console.log(cy.edges());

    var query = "u" + user_fbid;

    var root = cy.getElementById(query);

    var dijkstra = cy.elements().dijkstra(root, function(edge) {
        var weight = edgeWeights[edge.id()];
        return weight;
    }, false);

    var sortedItems = []

    //FIND LENGTH OF PATH TO ALL ITEMS
    cy.nodes().forEach(function(ele) {
        var indicator = ele.id().charAt(0);
        var id = ele.id().substring(1, ele.id().length);
        if (indicator == 'i') {
            var itemNode = cy.getElementById(ele.id());
            var length = dijkstra.distanceTo(itemNode)
            var struct = {
                weight: length,
                itemID: id
            }
            sortedItems.push(struct);
        }

    });

    sortedItems.sort(function(a, b) {
        return a.weight - b.weight;
    });

    var struct = {
        suggestions: sortedItems,
        dijkstra: dijkstra
    }
    return struct;
}

//Prints the cy graph. Innefficient - just for testing
function printSuggestions(users, items, suggestionsStruct) {
    printGraph(users, items);
    var suggestions = suggestionsStruct.suggestions
    var dijkstra = suggestionsStruct.dijkstra

    console.log('------------Print Suggestions----------------');

    for (var i = 0; i < suggestions.length; i++) {
        var itemStruct = suggestions[i];
        var item = getItem(itemStruct.itemID, items);
        console.log('Weight from user: ' + itemStruct.weight + ": " + item.title)
        printPathToItem(item._id, dijkstra, users, items);
        console.log();
    }

    console.log('------------End Print Suggestions----------------');
}

function printPathToItem(itemID, dijkstra, users, items) {
    var itemNode = cy.getElementById('i' + itemID);
    var path = dijkstra.pathTo(itemNode)
    console.log('START PATH');
    for (var i = 0; i < path.length; i++) {
        var indicator = path[i].id().charAt(0);
        var id = path[i].id().substring(1, path[i].id().length);

        //skip over the edges in the path, just look at nodes
        if (!(path[i].id().indexOf(',') > -1)) {
            console.log(getNameOfID(path[i].id(), users, items));
        }
    }
    console.log('END PATH');
}

//PARSE AN ENCODED STRING FROM THE GRPAH, RETURNS ITEM OR USER
function getNameOfID(encodedID, users, items) {
    var indicator = encodedID.charAt(0);
    var id = encodedID.substring(1, encodedID.length);
    if (indicator == 'u') {
        var user = getUser(id, users);
        return "FBID:   " + user.fbid + '           User: ' + user.fullName
    } else if (indicator == 'i') {
        var item = getItem(id, items);
        return "ItemID: " + item._id + "   Item: " + item.title
    }
}

function printGraph(users, items) {
    console.log('------------Begin printing Graph----------------');

    cy.nodes().forEach(function(ele) {
        console.log(getNameOfID(ele.id(), users, items));
    });
    console.log('------------End printing Graph----------------');
}



//test function, not efficient
function getItem(itemID, items) {
    for (var i = 0; i < items.length; i++) {
        if (items[i]._id == itemID) {
            return items[i];
        }
    }
}

//test function, not efficient
function getUser(fbid, users) {
    for (var i = 0; i < users.length; i++) {
        if (users[i].fbid == fbid) {
            return users[i];
        }
    }
}