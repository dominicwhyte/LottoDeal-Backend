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

// ADD VERTCES AND EDGES FOR USERS
User.find({}, function(err, users) {
//     if (err) throw err;
//     callback(users)
  if (err) {
    console.log("There was an error retrieving all items");
    continue;
  }
	if (users != null && items.length > 0) {
  	for (var i = 0; i < users.length; i++) {
    	cy.add(
        { group: "nodes", data: { id: "u" + i }} // may or may not have to specify a position here (x, y)
      ); 
    }
  	for (var i = 0; i < users.length; i++) {
    	for (var j = i + 1; j < users.length; j++) {
      	cy.add(
          { group: "edges", data: { id: "u" + i + "," + j, source: "u" + i, target: "u" + j } }
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
            { group: "nodes", data: { id: "i" + i }} // may or may not have to specify a position here (x, y)
          ); 
        }
        for (var i = 0; i < items.length; i++) {
          for (var j = i + 1; j < items.length; j++) {
            cy.add(
              { group: "edges", data: { id: "i"  + i + "," + j, source: "i" + i, target: "i" + j}}
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

// COMPUTE THE EDGE WEIGHTS (could be done in the above functionality, separated for simplicity)

