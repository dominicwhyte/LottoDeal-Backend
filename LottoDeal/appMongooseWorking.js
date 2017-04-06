const ITEM_COLLECTION = 'Items';
const USER_COLLECTION = 'Users';

var MongoClient = require('mongodb').MongoClient
    , assert = require('assert');

var ObjectId = require('mongodb').ObjectID;

var mongoose = require('mongoose');

// Connection URL
var url = 'mongodb://localhost:27017/LottoDeal';


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



/* MONGOOSE FUNCTIONALITY */


// Use connect method to connect to the server
mongoose.Promise = global.Promise;

// Connect to MongoDB database using mongoose API
mongoose.connect(url, function(err, db) {
    assert.equal(null, err);

  	var newItem = new Item ({title : "bike", price : 100, datePosted : new Date(), expirationDate: new Date(), pictureURL: "google", descrip: "hello"});
	// call the built-in save method to save to the database
	newItem.save(function(err) {
  		if (err) throw err;

  	console.log('Item saved successfully!');
	});
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
    userIDs: String,
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


// get a item with ID and update the userID array
Item.findById("58e5a89f78eaa966cf6f30fa", function(err, item) {
  if (err) throw err;
  var array = item.bids;
  var found = 0;
  for (i = 0; i < item.bids.length; i++) {
    if (item.bids[i].itemID == "bike") {
      var curAmount = item.bids[i].amount;
      curAmount += 10;
      item.bids[i].amount = curAmount;
      item.save();
      found = 1;
      break;
    }
  }
  if (!found) {
    var data = {userIDs: "bike", amount: 10};
    console.log(data);
    item.bids.push(data);
    item.save();
  }

  console.log('bid successfully updated!');

});


// get a user with ID and update the bids array
User.findById("58e5a89f78eaa966cf6f30fa", function(err, user) {
  if (err) throw err;
  var array = user.bids;
  var found = 0;
  for (i = 0; i < user.bids.length; i++) {
    if (user.bids[i].itemID == "bike") {
      var curAmount = user.bids[i].amount;
      curAmount += 10;
      user.bids[i].amount = curAmount;
      user.save();
      found = 1;
      break;
    }
  }
  if (!found) {
    var data = {itemID: "bike", amount: 10};
    console.log(data);
    user.bids.push(data);
    user.save();
  }

  console.log('bid successfully updated!');

});





// // Remove User
// User.findById('58e4789fa8251c56cbfbc466', function(err, user) {
//   if (err) throw err;

//   // delete
//   user.remove(function(err) {
//     if (err) throw err;
//     console.log('User successfully deleted!');
//   });
// });


// // Remove Item
// Item.findById('58e47437051a17558a9a7bf7', function(err, item) {
//   if (err) throw err;

//   // delete
//   item.remove(function(err) {
//     if (err) throw err;

//     console.log('Item successfully deleted!');
//   });
// });




// get all the users
User.find({}, function(err, users) {
  if (err) throw err;
  console.log(users[0]);
  // object of all the users
//  console.log(users);
});

// // get all the Items
// Item.find({}, function(err, items) {
//   if (err) throw err;

//   // object of all the users
//   console.log(items);
// });


















// //func createItem(String title, int price, String datePosted, string expirationDate, String pictureURL, String descrip) 
// var createItem = function(db, title, price, datePosted, expirationDate, pictureURL, descrip, callback) {
//     // Get the documents collection
//     var collection = db.collection(ITEM_COLLECTION);
//     // Insert some documents
//     collection.insertMany([
//                {'title': title, 'price': price, 'datePosted': datePosted, 'expirationDate' : expirationDate, 'pictureURL': pictureURL, 'descrip':descrip}
//                ], function(err, result) {
//                   assert.equal(err, null);
//                   console.log("Inserted an Item");
//                   callback(result);
//               });
// }

// var createUser = function(db, fullName, fbid, pictureURL, callback) {
//     // Get the documents collection
//     var collection = db.collection(USER_COLLECTION);
//     // Insert some documents
//     collection.insertMany([
//                {'fullName' : fullName, 'fbid' : fbid, 'pictureURL' : pictureURL}
//                ], function(err, result) {
//                   assert.equal(err, null);
//                   console.log("Inserted a User");
//                   callback(result);
//               });
// }

// var findItems = function(db, callback) {
//   // Get the documents collection
//   var collection = db.collection(ITEM_COLLECTION);
//   // Find some documents
//   collection.find({}).toArray(function(err, docs) {
//     assert.equal(err, null);
//     console.log("Found the following records");
//     console.log(docs)
//     callback(docs);
//   });
// }

// var findUsers = function(db, callback) {
//   // Get the documents collection
//   var collection = db.collection(USER_COLLECTION);
//   // Find some documents
//   collection.find({}).toArray(function(err, docs) {
//     assert.equal(err, null);
//     console.log("Found the following records");
//     console.log(docs)
//     callback(docs);
//   });
// }

// var addBidForItem = function(db, itemID, userID, amount, callback) {
//   // Get the documents collection
//   var collection = db.collection(USER_COLLECTION);
//   // Update document where a is 2, set b equal to 1
//     var hello = collection.find({'_id': ObjectId(userID)}, {bids:1});
//  //   var check = hello.find({bids:itemID})
//    console.log(hello);
//  db.close()
//   // collection.updateOne({'_id': ObjectId(userID)}
//   //   , { $set: { 'bids' : {'itemID' : itemID, 'amount' : amount} } }, function(err, result) {
//   //   assert.equal(err, null);
//   //   console.log("Added a bid");
//   //   callback(result);
//   // });  
// }


// // delete an item
// var deleteItem = function(db, id, callback) {
//   // Get the documents collection
//   var collection = db.collection(ITEM_COLLECTION);
//   // Delete document id is the object id
//   collection.deleteOne({"_id": ObjectId(id)}, function(err, result) {
//     assert.equal(err, null);
//     console.log("Removed the item");
//     callback(result);
//   });    
// }

// // delete an item
// var deleteUser = function(db, id, callback) {
//   // Get the documents collection
//   var collection = db.collection(USER_COLLECTION);
//   // Delete document id is the object id
//   collection.deleteOne({'_id': ObjectId(id)}, function(err, result) {
//     assert.equal(err, null);
//     console.log("Removed the user");
//     callback(result);
//   });    
// }











   //  // deleteUser(db, '58df2348c3912f697191ad68', function(){
   //  //  findUsers(db, function() {
   //  //      db.close()
   //  //  });
   //  // });

   //  // createItem(db, "bike", 72, "may", "may1", "google.com", "cool bike", function(){
   //  //     console.log("added");
   //  // });

   //  // createUser(db, 'John Smith', '234234234', 'facebook.com/johnny', function() {
   //  //     console.log("created user");
   //  // });
   //  //58e0004dce3d80f02f810d61
   //  findUsers(db,function(){

   //  });
   //  addBidForItem(db, '58dff4f1630b42eca5919c9b', '58dff5c639df5ded08b33e93', 5, function(){
   //      findUsers(db, function() {
   //          db.close()
   //      });
   //  });
   //    //   createUser(db, 'John Smith', '234234234', 'facebook.com/johnny', function() {
   //    //    createItem(db, 'Bike', '120', '04122007', '05122007', 'www.google.com', 'test desc', function() {
   //          // findItems(db, function() {
   //          //  findUsers(db, function() {
   // //                   db.close();
   //          //  })
   // //          });
   //    //    });
   //    // });

