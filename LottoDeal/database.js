const ITEM_COLLECTION = 'Items';
const USER_COLLECTION = 'Users';

var MongoClient = require('mongodb').MongoClient
    , assert = require('assert');

var ObjectId = require('mongodb').ObjectID;

var mongoose = require('mongoose');

// Connection URL
var url = 'mongodb://localhost:27017/LottoDeal';

// Use connect method to connect to the server





/* SERVER FUNCTIONALITY */
var express = require('express')
var app = express()

app.get('/', function(request, response) {
  response.send("API is working!")
})

// will create a new post, and associate it with a user in our database
app.post('/createPost', function(request, response) {
  // Parse the response
  // response usually comes in response.params or response.query

  // Make sure that the response is in the proper format to prevent malicious access

  console.log(response) // check what is inside response
  response.send("You have created a new post.")
})

// Will add a new user to our database
app.post('/createUser', function(request, response) {
  response.send("You have created a new user")
})

// A user has bid on an item, add this bid to database
app.post('/addBid', function(request, response) {
  // get into database, access object, update it's bid field and add to user bids


  response.send("Bid added")
})

// Send back all posts
app.get('/getPosts', function(request, response) {
  // get all of the posts and return them to frontend to load on feed
  // might not need to include bids


  response.send("Here are all of the posts")
})

// Send back either a serialized or full version of all users
app.get('/getUsers', function(request, response) {
  response.send("Here are all of the users")
})

// Send back the bids on the passed in item parameter, in case user wants to
// see the people that bid on his item
app.get('/getBids', function(request, response) {
  response.send("Here are all of the bids on this item")
})

// Start the server at localhost:8000
app.listen(8000, function() {
  console.log("App is listening on port 8000")
})






mongoose.Promise = global.Promise;


mongoose.connect(url, function(err, db) {
    assert.equal(null, err);

    createUser("dom", "1234", "google.com");
    findUsers();

    console.log("Connected successfully to server");

});



var Schema = mongoose.Schema;

// create a schema
var userSchema = new Schema({
  fullName: String, // facebook given (String)
  fbid: String, // facebook given 
  pictureURL: String, //profile pic URL from Facebook (String)
  bids: [{
    itemID: String,
    amount: Number
  }], //Bid object as dictionary containing all current bids of that user (indexed by itemID).  If a person bids twice on an item, the bid for that itemID is increased (Dictionary)
});

var User = mongoose.model('User', userSchema);

// create a schema
var itemSchema = new Schema({
	title: String, // title of the item being sold (String)
	price: Number, //price in USD (int)
	datePosted: Date, //date the item was posted (String - parse into Date object)
	expirationDate: Date, // date when if the item was not sold then everyone gets refunded (String- parse into Date object)
	userIDs: [{
    ID: String,
    amount: Number,
  }], //Dictionary of fbid’s of users who have placed bids (Dictionary)
	pictureURL: String, // picture of item (we can make it more than one if needed (String)
	descrip: String, // text string of what exactly is being sold (String)
});

var Item = mongoose.model('Item', itemSchema);

module.exports = User;
module.exports = Item;


var createUser = function(name, id, url) {
  var newUser = new User ({fullName : name, fbid : id, pictureURL : url});
  // call the built-in save method to save to the database
  newUser.save(function(err) {
      if (err) throw err;
      console.log('User saved successfully!');
  });
}

var createItem = function(title, price, datePosted, expirationDate, pictureURL, descrip) {
  var newItem = new Item ({title : "bike", price : 100, datePosted : new Date(), expirationDate: new Date(), pictureURL: "google", descrip: "hello"});
  // call the built-in save method to save to the database
  newItem.save(function(err) {
      if (err) throw err;

    console.log('Item saved successfully!');
  });
}

var addBidForItem = function(itemID, userID, newAmount) {
  // get a item with ID and update the userID array
  Item.findById(itemID, function(err, item) {
    if (err) throw err;
    var array = item.bids;
    var found = 0;
    for (i = 0; i < item.bids.length; i++) {
      if (item.userIDs[i].ID == userID) {
        var curAmount = item.userIDs[i].amount;
        curAmount += newAmount;
        item.userIDs[i].amount = curAmount;
        item.save();
        found = 1;
        break;
      }
    }
    if (!found) {
      var data = {ID: userID, amount: newAmount};
      console.log(data);
      item.bids.push(data);
      item.save();
    }

    console.log('bid successfully updated!');

  });



  // get a user with ID and update the bids array
  User.findById(userID, function(err, user) {
    if (err) throw err;
    var array = user.bids;
    var found = 0;
    for (i = 0; i < user.bids.length; i++) {
      if (user.bids[i].itemID == itemID) {
        var curAmount = user.bids[i].amount;
        curAmount += newAmount;
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

    console.log('bid successfully updated!');

  });

}



var deleteUser = function(id, callback) {
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


var deleteItem = function(db, id, callback) {
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


var findUsers = function() {
  // get all the users
  User.find({}, function(err, users) {
    if (err) throw err;
    console.log(users);
    // object of all the users
  //  console.log(users);
  });
}
var findItems = function() {
  // get all the Items
  Item.find({}, function(err, items) {
    if (err) throw err;

    // object of all the users
    console.log(items);
  });
}