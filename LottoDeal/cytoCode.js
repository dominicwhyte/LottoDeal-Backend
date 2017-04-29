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

// ADD VERTCES AND EDGES FOR USERS
User.find({}, function(err, users) {
//     if (err) throw err;
//     callback(users)
  if (err) {
    console.log("There was an error retrieving all items");
    continue;
  }
	if (users != null && users.length > 0) {
  	for (var i = 0; i < users.length; i++) {
    	cy.add(
        { group: "nodes", data: { id: "u" + users[i].fbid}} // may or may not have to specify a position here (x, y)
      ); 
    }
  	for (var i = 0; i < users.length; i++) {
    	for (var j = i + 1; j < users.length; j++) {
      	cy.add(
          { group: "edges", data: { id: "u" + users[i].fbid + "," + users[j].fbid, source: "u" + users[i].fbid, target: "u" + users[j].fbid } }
        );
      }
    }

    // ADD VERTICES AND EDGES FOR ITEMS
    Item.find({}, function(err, items) {
      if (err) {
        console.log("There was an error retrieving all items")
        continue;
      }
      if (items != null && items.length > 0) {
        for (var i = 0; i < items.length; i++) {
          cy.add(
            { group: "nodes", data: { id: "i" + items[i]._id }} // may or may not have to specify a position here (x, y)
          ); 
        }
        for (var i = 0; i < items.length; i++) {
          for (var j = i + 1; j < items.length; j++) {
            cy.add(
              { group: "edges", data: { id: "i"  + items[i]._id + "," + items[j]._id, source: "i" + items[i]._id, target: "i" + items[j]._id}}
            )
          } 
        }
      }
      else {
        console.log("Oops, There are no items!")
      }
    });
  }
	else {
    	console.log("Oops, there are no users!");
  }
});


var edgeWeights = {};


// ADD THE EDGES BETWEEN USERS AND THE ITEMS THEY HAVE BID ON
Users.find({}, function(err, users) {
  if (err) {
    console.log("There was an error retrieving all users");
    continue;
  }
  else if (users != null && users.length > 0) {
    for (var i = 0; i < users.length; i++) {
      for (var j = 0; j < users[i].bids.length; j++) {
        cy.add(
          { group: "edges", data: { id: "ui" + users[i].fbid + "," + users[i].bids[j].itemID, source: "u" + users[i].fbid, target: "i" + users[i].bids[j].itemID } }
        );
        edgeWeights["ui" + users[i].fbid + "," + users[i].bids[j].itemID] = 1;
      }
    }
  }
  else {
    console.log("Oops, there are no users!")
  }
})



// var edgeWeights = {};
var canCallDijkstra = false;

// COMPUTE THE EDGE WEIGHTS (could be done in the above functionality, separated for simplicity)
// ADD EDGE WEIGHTS FOR USERS
User.find({}, function(err, users) {
  if (err) {
    console.log("There was an error retrieving all items");
    continue;
  }
  if (users != null && items.length > 0) {
    for (var i = 0; i < users.length; i++) {
      for (var j = i + 1; j < users.length; j++) {
        var similarity = Math.abs(users[i].userInfo.age - users[j].userInfo.age); //  COMPARE THE USERS HERE
        if (users[i].userInfo.gender == users[j].userInfo.gender) {
          similarity = similarity; // keep it the same?
          edge = "u" + users[i].fbid + "," + users[j].fbid;
          edgeWeights[edge] = similarity;
        }
        else {
          similarity += 1; // in case difference in age was 0
          similarity *= 2; // double?
          edge = "u" + users[i].fbid + "," + users[j].fbid;
          edgeWeights[edge] = similarity;
        }
      }
    }

    // ADD EDGE WEIGHTS FOR ITEMS
    Item.find({}, function(err, items) {
      if (err) {
        console.log("There was an error retrieving all items")
        continue;
      }
      if (items != null && items.length > 0) {
        for (var i = 0; i < items.length; i++) {
          for (var j = i + 1; j < items.length; j++) {
            var similarity = stringSimilarity.compareTwoStrings(items[i].title, items[j].title);
            edge = "i" + items[i]._id + "," + items[j]._id;

            // should the edge going the other way be added too?
            edgeWeights[edge] = similarity;
          } 
        }

        // ALL OF THE EDGEWEIGHT COMPUTATION IS COMPLETE
        console.log(edgeWeights);

        // can now call dijkstra
        canCallDijkstra = true;

      }
      else {
        console.log("Oops, There are no items!")
      }
    });
  }
  else {
      console.log("Oops, there are no users!");
  }
});


var shortestPaths = function(user_fbid) {
  if (canCallDijkstra = true) {
    var dijkstra = cy.elements().dijkstra({root: "u" + user_fbid, weight: function(edge) {
      return edgeWeights[edge];
    }, directed: false}, function() {
      return this.data("weight");
    })
  }
  else {
    console.log("Oops, not all edge weights have been computed yet!")
    return null;
  }
}

