const ITEM_COLLECTION = 'Items';
const USER_COLLECTION = 'Users';

var MongoClient = require('mongodb').MongoClient
    , assert = require('assert');

var ObjectId = require('mongodb').ObjectID;

// Connection URL
var url = 'mongodb://localhost:27017/LottoDeal';

// Use connect method to connect to the server
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("Connected successfully to server");
    // deleteUser(db, '58df2348c3912f697191ad68', function(){
    //  findUsers(db, function() {
    //      db.close()
    //  });
    // });

    // createItem(db, "bike", 72, "may", "may1", "google.com", "cool bike", function(){
    //     console.log("added");
    // });

    // createUser(db, 'John Smith', '234234234', 'facebook.com/johnny', function() {
    //     console.log("created user");
    // });

    addBidForItem(db, '58dff4f1630b42eca5919c9b', '58dff5c639df5ded08b33e93', 5, function(){
      db.close();
    });

    findUsers(db, function() {
      db.close();
    });




      //   createUser(db, 'John Smith', '234234234', 'facebook.com/johnny', function() {
      //    createItem(db, 'Bike', '120', '04122007', '05122007', 'www.google.com', 'test desc', function() {
            // findItems(db, function() {
            //  findUsers(db, function() {
   //                   db.close();
            //  })
   //          });
      //    });
      // });
});

//func createItem(String title, int price, String datePosted, string expirationDate, String pictureURL, String descrip) 
var createItem = function(db, title, price, datePosted, expirationDate, pictureURL, descrip, callback) {
    // Get the documents collection
    var collection = db.collection(ITEM_COLLECTION);
    // Insert some documents
    collection.insertMany([
               {'title': title, 'price': price, 'datePosted': datePosted, 'expirationDate' : expirationDate, 'pictureURL': pictureURL, 'descrip':descrip}
               ], function(err, result) {
                  assert.equal(err, null);
                  console.log("Inserted an Item");
                  callback(result);
              });
}

var createUser = function(db, fullName, fbid, pictureURL, callback) {
    // Get the documents collection
    var collection = db.collection(USER_COLLECTION);
    // Insert some documents
    collection.insertMany([
               {'fullName' : fullName, 'fbid' : fbid, 'pictureURL' : pictureURL}
               ], function(err, result) {
                  assert.equal(err, null);
                  console.log("Inserted a User");
                  callback(result);
              });
}

var findItems = function(db, callback) {
  // Get the documents collection
  var collection = db.collection(ITEM_COLLECTION);
  // Find some documents
  collection.find({}).toArray(function(err, docs) {
    assert.equal(err, null);
    console.log("Found the following records");
    console.log(docs)
    callback(docs);
  });
}

var findUsers = function(db, callback) {
  // Get the documents collection
  var collection = db.collection(USER_COLLECTION);
  // Find some documents
  collection.find({}).toArray(function(err, docs) {
    assert.equal(err, null);
    console.log("Found the following records");
    console.log(docs)
    callback(docs);
  });
}

var addBidForItem = function(db, itemID, userID, amount, callback) {
  // Get the documents collection
  var collection = db.collection(USER_COLLECTION);

  var exists = collection.find(
    {'_id': ObjectId(userID), 'bids.itemID': itemID}).count()

 //update
if (exists) {
  collection.updateOne({'_id': ObjectId(userID), 'bids.$.itemID' : itemID},
    { $inc: { 'bids.$.amount' : amount} }, function(err, result) {
    assert.equal(err, null);
    console.log("Added a bid");
    callback(result);
  });
}

else { // doesnt exist
  collection.updateOne({'_id': ObjectId(userID)}
    , { $addToSet: { 'bids.$' : {'itemID' : itemID, 'amount' : amount} } }, function(err, result) {
    assert.equal(err, null);
    console.log("Added a bid");
    callback(result);
  });

}

// else {
//   collection.updateOne({'_id': ObjectId(userID)}
//     , { $addToSet: { 'bids' : {'itemID' : itemID, 'amount' : amount} } }, function(err, result) {
//     assert.equal(err, null);
//     console.log("Added a bid");
//     callback(result);
//   });  
// }

}


// delete an item
var deleteItem = function(db, id, callback) {
  // Get the documents collection
  var collection = db.collection(ITEM_COLLECTION);
  // Delete document id is the object id
  collection.deleteOne({"_id": ObjectId(id)}, function(err, result) {
    assert.equal(err, null);
    console.log("Removed the item");
    callback(result);
  });    
}

// delete an item
var deleteUser = function(db, id, callback) {
  // Get the documents collection
  var collection = db.collection(USER_COLLECTION);
  // Delete document id is the object id
  collection.deleteOne({'_id': ObjectId(id)}, function(err, result) {
    assert.equal(err, null);
    console.log("Removed the user");
    callback(result);
  });    
}



