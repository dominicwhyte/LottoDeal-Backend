/* SERVER FUNCTIONALITY */
var express = require('express')
var app = express()
var https = require('https')
var fs = require('fs')
const SECONDS_UNTIL_CHECK_FOR_PERFROMING_LOTTERIES = 3;
var json = require('express-json')
var bodyParser = require("body-parser")
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json())
app.use(json())

var multer = require('multer')
var upload = multer({dest: 'uploads/'})


var fs = require('fs'); // add for file system
// app.get('/',function(req,res){
// fs.readFile('index.html',function (err, data){
//     res.writeHead(200, {'Content-Type': 'text/html','Content-Length':data.length});
//     res.write(data);
//     res.end();
// });

// });


//Check if lotteries should be performed
function checkIfServerShouldPerformLottery(){
    // do whatever you like here
    console.log('Checking if lottery should be performed')
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
    key : fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt')
};

app.use(function(req, res, next) {
    var allowedOrigins = ['https://dominicwhyte.github.io'];
    var origin = req.headers.origin;
    if(allowedOrigins.indexOf(origin) > -1){
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    //res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:8020');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', true);
    return next();
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
app.post('/performPayment', function(request, response) {
    // get into database, access object, update it's bid field and add to user bids
    console.log('Payment performing')
    var stripe = require("stripe")("sk_test_eg2HQcx67oK4rz5G57XiWXgG");

    // Token is created using Stripe.js or Checkout!
    // Get the payment token submitted by the form:
    var token = request.body.stripeToken; // Using Express

    // Charge the user's card:
    var charge = stripe.charges.create({
        amount: request.body.amount,
        currency: "usd",
        description: "Example charge",
        source: token,
    }, function(err, charge) {
        
        console.log(err)
        response.send("charge is" + charge.amount)

        
        // asynchronously called
    });
})


//End Stripe Code ------------------------------------------------------

// Send back the reviews on the passed in item parameter, in case user wants to
// see the people that bid on his item
app.get('/getReviews', function(request, response) {
    var sellerID = request.query["sellerID"];
    console.log("this is the request" + request.body);
    findUser(sellerID, function(user) {
        console.log("this is the user's reviews" + user)
        response.send(JSON.stringify(user.reviews));
    });
})



app.get('/getAccount', function(request, response) {
    var userID = request.query["userID"];
    findUser(userID, function(user) {
        console.log("this is the user's reviews" + user)
        response.send(JSON.stringify(user));
    });
})



app.get('/getNotifications', function(request, response) {
    console.log('getting notifications');
    // var userID = '1641988472497790';
    // console.log(request)
    // console.log(request.body);
    var userID = request.query["userID"];
    findUser(userID, function(user) {
        getNotificationsForUsers(userID, function(notifications) {
        console.log('notifications = ' + JSON.stringify(notifications))
        response.send(JSON.stringify(notifications));
         });
    });
})





app.get('/getBidsofUsers', function(request, response) {
    var userID = request.query["userID"];
    getBidsForUsers(userID, function(bids) {
        console.log('bids = ' + JSON.stringify(bids))
        response.send(JSON.stringify(bids));
    });
})


app.get('/getBiddedItemsofUsers', function(request, response) {
    var userID = request.query["userID"];
    getItemsForUsers(userID, function(items, bidslength, i) {
        if (i == bidslength) {
        console.log("items your'e bidding on = " + JSON.stringify(items));
        response.send(JSON.stringify(items));
        }
    });
})


app.get('/getListedItemsForUsers', function(request, response) {

    var userID = request.query["userID"];
    console.log(userID);
    console.log("fetching listed itemSchema")
    getListedItemsForUsers(userID, function(items) {
            console.log("fetching listed itemSchema")
            console.log("selling items = " + JSON.stringify(items));
            response.send(JSON.stringify(items));
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
        });
})




app.get('/', function(request, response) {
    response.send("API is working!")
})

// will create a new post, and associate it with a user in our database
// app.post('/createPost', function(request, response) {
//     // Parse the response
//     console.log(request)
//     console.log(request.body);
//     console.log(request.files);

//     // create a new post in the database
//     var date = new Date();
//   //  var timecreated = date.getTime();
//   var expirationDate = request.body.expirationDate;
//   var title = request.body.title;
//   var price = request.body.price;
//     //var image = request.body.picture; 
//     var description = request.body.description;
//     var sellerID = request.body.sellerID;

//     // var post = {
//     //     timecreated: timecreated,
//     //     expirationDate: expirationDate,
//     //     title: title,
//     //     price: price,
//     //    // image: image,
//     //     description: description
//     // }
// //    console.log(post)

// // should be giving it a date instead of a time
// createItem(title, price, date, expirationDate, description, sellerID);

// response.send("You have created a new post.")
// })

var cpUpload = upload.fields([{ name: 'title', maxCount: 1 }, 
    { name: 'price', maxCount: 1 },
    { name: 'picture', maxCount: 1},
    { name: 'description', maxCount: 1},
    { name: 'expirDate', maxCount: 1},
    { name: 'userID', maxCount: 1}])
app.post('/createPost', cpUpload, function (req, res, next) {
  // req.files is an object (String -> Array) where fieldname is the key, and the value is array of files
  //
  // e.g.
  //  req.files['avatar'][0] -> File
  //  req.files['gallery'] -> Array
  //
  // req.body will contain the text fields, if there were any
  // console.log(req)
  console.log(req.files)
  console.log(req.body)
// img: {data: Buffer, // stores an image here
//         contentType: String},
  // image
  var picture = req.files['picture'][0]
  var imagePath = "./uploads/" + picture.filename;
  var imageData = fs.readFileSync(imagePath);
  var image = {}
  image["data"] = imageData
  image["contentType"] = 'image/png';

  console.log(image)
  var title = req.body.title;
  var price = req.body.price;
  var offset = req.body.expirDate;
  var expirationDate = new Date()
  var date = new Date();

    if (offset == 1) {
        expirationDate.setDate(date.getDate() + 1); 
    }
    else if (offset == 2) {
        expirationDate.setDate(date.getDate() + 7); 
    }
    else {
        expirationDate.setDate(date.getDate() + 30); 
    }
  var description = req.body.description;
  var sellerID = req.body.userID;
  

  createItem(title, price, date, expirationDate, description, sellerID, image);

  res.redirect('https://dominicwhyte.github.io/LottoDeal-Frontend/sell.html');
})


// Will add a new user to our database
app.post('/createUser', function(request, response) {
    // Parse the response
    console.log(request.body);
    var name = request.body.name;
    var id = request.body.fbid;
    var url = request.body.url;
    var email = request.body.email;

    var users = findAllUsers(function (users) {
        var usersLength = users.length;
        var found = 0;

        for (var i = 0; i < usersLength; i++) {
            if (users[i].fbid === id) {
                //response.send("User already exists");
                found = 1;
            }
        }

        if (!found) {
            createUser(name, id, url, email);
            //response.send("You have created a new user");
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
        user.email = email;
        user.save();
        console.log("here's your new email" + user.email)
        response.send("updated settings");
    });

})

// A user has bid on an item, add this bid to database
app.post('/addBid', function(request, response) {
    // get into database, access object, update it's bid field and add to user bids

    var itemID = request.body.itemID;
    var userID = request.body.userID;
    var newAmount = request.body.newAmount;

    addBidForItem(itemID, userID, newAmount);
    addNotificationToUser(userID, "New Bid", "You just bid " + newAmount + " dollar(s)");

    response.send("Bid added")
})

// Send back all posts
app.get('/getPosts', function(request, response) {
    // get all of the posts and return them to frontend to load on feed
    // might not need to include bids

    var items = findAllItems(function(items) {
       // console.log(items);
       response.send(JSON.stringify(items))
   });
    
})

// Send back either a serialized or full version of all users
app.get('/getUsers', function(request, response) {

    var users = findAllUsers(function(users){
        response.send(JSON.stringify(users))
    });
    
})

// Send back the bids on the passed in item parameter, in case user wants to
// see the people that bid on his item
app.get('/getBids', function(request, response) {
    response.send("Here are all of the bids on this item")

    var title = request.body.title;
    var item = findItem(title);

})

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

var MongoClient = require('mongodb').MongoClient
, assert = require('assert');

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

    //findAllUsers();
    console.log("Connected successfully to server");
    
    //addBidForItem("58efe4435363382e3d61137a", "58e8054642a9960421d3a566", 3);
    var date = new Date();
 
    findAllUsers(function(users) {
        console.log(users)
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

    findAllItems(function (items) {
        console.log(items);
    });

    //checkIfServerShouldPerformLottery();
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
    notifications: [{ // notifications to show user
        read: Boolean,
        title: String,
        description: String,
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
    }], //Dictionary of fbid’s of users who have placed bids (Dictionary)
    descrip: String, // text string of what exactly is being sold (String)
    img: {data: Buffer, // stores an image here
        contentType: String},
    // picture: String,
    sold: Boolean, // has the item been sold
    sellerID: String, // who's selling the item
    winnerID: String, // who the winner of an item is
    });

var Item = mongoose.model('Item', itemSchema);

module.exports = User;
module.exports = Item;





var createUser = function(name, id, url, email) {
    var newUser = new User ({fullName : name, email: email, fbid : id, pictureURL : url, bids : [], reviews : [], notifications : []});

    // call the built-in save method to save to the database
    newUser.save(function(err) {
        if (err) throw err;
        console.log('User saved successfully!');
    });
}

var createItem = function(title, price, datePosted, expirationDate, descrip, sellerID, picture) {
    var newItem = new Item ({title : title, price : price, datePosted : datePosted, expirationDate: expirationDate, amountRaised : 0, descrip: descrip, bids : [], sold: false, sellerID: sellerID, img: picture});
    console.log(newItem)
    // call the built-in save method to save to the database
    // newItem.img.data = fs.readFileSync(image);
    // newItem.img.contentType = 'image/png';

    newItem.save(function (err, newItem) {
      if (err) throw err;});

    newItem.save(function(err) {
        if (err) throw err;

        console.log('Item saved successfully!');
    });
}


var addNotificationToUser = function(userID, titleText, descriptionText) {
    User.find({fbid:userID}, function(err, user) {
        if (user.length != 1) {
            console.log('ERROR: multiple users with FBID')
        }
        else {
            if (err) throw err;
            var data = {read: false, title: titleText, description: descriptionText};

            user[0].notifications.push(data);
            user[0].save();
        }        
    });
}

var getNotificationsForUsers = function(userID, callback) {
    User.find({fbid:userID}, function(err, user) {
        console.log('Got notifications for user' + userID) 
        callback(user[0].notifications)
    });
}

var getBidsForUsers = function(userID, callback) {
    User.find({fbid:userID}, function(err, user) {
        console.log('Got bids for user' + userID) 
        callback(user[0].bids)
    });
}








var getItemsForUsers = function(userID, callback) {

   User.find({fbid:userID}, function(err, user) {
    var itemIDs = [];
    var bids = user[0].bids;
    for (var i = 0; i < bids.length; i++) {
        itemIDs.push(bids[i].itemID);
    }

    Item.find({'_id' : itemIDs}, function(err, items){
        console.log("here are all your items" + items)
        callback(items);
    });

});

}

// var getItemsForUsers = function(userID, callback) {
//     User.find({fbid:userID}, function(err, user) {
//         var items = [];
//         var bids = user[0].bids;
//         for (var i = 0; i < bids.length; i++) {
//             var id = bids[i].itemID;
//             var temp = i;
//                 console.log(i)
//                 console.log(bids.length)

//             Item.findById(id, function(err, item) {
//                 console.log(temp)
//                 console.log(i)
//                 console.log(bids.length)
//                 if (err) throw err;
//                 // object of all the users
//                 console.log("Here's your tiem for bidding" + item);
//                 items.push(item);

//                     console.log("THIS IS THE ITEMS ARRAY for bidding" + items)
//                     console.log('Got items for user for bidding' + userID)

//                     // i is weird and incremented
//                     callback(items, bids.length-1, temp)
                
//             });
//         }  

//     });
// }

var getListedItemsForUsers = function(userID, callback) {
    Item.find({sellerID:userID, sold:false}, function(err, items) {
        callback(items);
    });
}


var getSoldItemsForUsers = function(userID, callback) {
    Item.find({sellerID:userID, sold:true}, function(err, items) {
        callback(items);
    });
}

app.get('/getReviewerImagesandNames', function(request, response) {
    var userID = request.query["userID"];

    var reviewersID = []

    findUser(userID, function (user) {
        var reviews = user.reviews;
        for (var i = 0; i < reviews.length; i++) {
            reviewersID.push(reviews[i].userID);
        }

        console.log("Here are all the reviewersID IDs" + reviewersID);
        User.find({fbid:reviewersID}, function(err, reviewers) {
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
    });
});


var createReview = function(sellerID, reviewerID, stars, reviewDes, date) {
    User.find({fbid:sellerID}, function(err, user) {
            if (err) throw err;
             var data = {userID: reviewerID, stars: stars, reviewDes: reviewDes, datePosted: date};
             console.log(data);
            user[0].reviews.push(data);
            user[0].save();
            console.log(user[0].reviews)
        
    });
}


//Check database for if lotteries should be performed
var checkLotteries = function() {
    Item.find({}, function(err, items) {
        if (err) throw err;
        
        for (i = 0; i < items.length; i++) {
            var item = items[i]
            var expirDate = new Date(item.expirationDate)
            if (item.amountRaised >= item.price) {
                var winner = performLottery(item);
                console.log('Item sold to ' + winner)
            }
            else if (expirDate < Date.now()) {
                console.log('Date has past')
            }
            else {
                console.log('Item checked - no changes')
            }
      }
  });
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
        console.log('checking')
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
    var winnerID = "1234";
    item.winner = winnerID;
    item.save();
    return winner

}




        // A.findById(a, function (err, doc) {
        //   if (err) return next(err);
        //   res.contentType(doc.img.contentType);
        //   res.send(doc.img.data);
        //   // how to send it back to the sever from my computer

var addBidForItem = function(itemID, userID, newAmount) {
    // get a item with ID and update the userID array
    Item.findById(itemID, function(err, item) {
        if (err) throw err;
        var array = item.bids;
        var found = false;

        if (item.bids != null) {
            for (i = 0; i < item.bids.length; i++) {
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
            var data = {ID: userID, amount: newAmount};
            console.log(data);
            item.bids.push(data);
            item.amountRaised += newAmount;
            item.save();
        }

        console.log('bid successfully updated!');
        


    });

    var users = findAllUsers(function (users) {
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
                        var data = {itemID: itemID, amount: newAmount};
                        console.log(data);
                        user.bids.push(data);
                        user.save();
                    }
                    // sendEmailToAddress(user.email, "Congrats!", "You bid $" + newAmount + " on " + item.title)
                    console.log('bid successfully updated!');
                }
                break;
            }
        }
    });


    // get a user with ID and update the bids array
    // User.findById(userID, function(err, user) {
    //     if (err) throw err;

    //     if (user != null) {
    //         var array = user.bids;
    //         var found = 0;
    //         if (user.bids != null) {
    //             for (i = 0; i < user.bids.length; i++) {
    //                 if (user.bids[i].itemID == itemID) {
    //                     var curAmount = user.bids[i].amount;
    //                     curAmount += newAmount;
    //                     user.bids[i].amount = curAmount;
    //                     user.save();
    //                     found = 1;
    //                     break;
    //                 }
    //             }
    //             if (!found) {
    //                 var data = {itemID: itemID, amount: newAmount};
    //                 console.log(data);
    //                 user.bids.push(data);
    //                 user.save();
    //             }

    //             console.log('bid successfully updated!');
    //         }

    //     }
    //     else {
    //         console.log('user not found');
    //     }


    // });
}




var deleteUser = function(id) {
    // Remove User
    User.findById(id, function(err, user) {
        if (err) throw err;

    // delete
    user.remove(function(err) {
        if (err) throw err;
        console.log('User successfully deleted!');
    });
});
}


var deleteItem = function(id) {
    // Remove Item
    Item.findById(id, function(err, item) {
        if (err) throw err;

    // delete
    item.remove(function(err) {
        if (err) throw err;

        console.log('Item successfully deleted!');
    });
});
}


var findUser = function(fbid, callback) {
    // get all the users
    User.find({fbid: fbid}, function(err, user) {
        if (err) throw err;
        console.log(user[0]);    
        callback(user[0]);
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
        console.log('All User successfully deleted!');
    });

}

var deleteAllItems = function() {
    // get all the users

    Item.remove({}, function(err) {
        if (err) throw err;
        console.log('All Items successfully deleted!');
    });

}

var findItem = function(title) {
    // get all the Items
    Item.find({title: title}, function(err, item) {
        if (err) throw err;
    // object of all the users
    console.log(items);
    return item;
});
}

var findItembyID = function(id) {
    // get all the Items
    Item.findById(id, function(err, item) {
        if (err) throw err;
    // object of all the users
    console.log(item);
    return item;
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