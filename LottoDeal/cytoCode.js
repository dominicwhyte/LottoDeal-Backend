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

exports.computeSimilarities = function(userID, User, Item) {
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
                        var suggestions = getSuggestedItems(userID, users);
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
            //slightly favor bigger bids to have lower weights
            edgeWeights["c" + users[i].fbid + "," + users[i].bids[j].itemID] = (1 / users[i].bids[j].amount) * BID_MUTLIPLIER;
        }
    }
}

var ITEM_SIMILARITY_MULTIPLIER = 2;
var USER_GENDER_DISPARITY_MULTIPLIER = 2;
var BID_MUTLIPLIER = 3;
var TITLE_MULTIPLIER = 3;

// COMPUTE THE EDGE WEIGHTS
function computeEdgeWeights(users, items) {

    // ADD EDGE WEIGHTS FOR USERS
    for (var i = 0; i < users.length; i++) {
        for (var j = i + 1; j < users.length; j++) {
            var similarity = Math.abs(users[i].userInfo.age - users[j].userInfo.age); 
            if (users[i].userInfo.gender == users[j].userInfo.gender) {
                similarity /= USER_GENDER_DISPARITY_MULTIPLIER;
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
            var similarity = (1 - stringSimilarity.compareTwoStrings(items[i].title, items[j].title)) * TITLE_MULTIPLIER; 
            similarity += 1 - stringSimilarity.compareTwoStrings(items[i].shortDescription, items[j].shortDescription);
            similarity += 1 - stringSimilarity.compareTwoStrings(items[i].longDescription, items[j].longDescription);
            similarity *= ITEM_SIMILARITY_MULTIPLIER // mult
            edge = "i" + items[i]._id + "," + items[j]._id;
            // should the edge going the other way be added too?
            edgeWeights[edge] = similarity;
        }
    }
}

// console.log('test: ' + stringSimilarity.compareTwoStrings("HP 15-ay018nr 15.6-Inch Laptop (Intel Core i7, 8GB RAM, 256GB SSD)", " Razor 62042 High Roller BMX/Freestyle Bike"));

// console.log('test2: ' + stringSimilarity.compareTwoStrings("bike", "Used bike"));


//Compute the shortest paths for user_fbid. Only include items that have not already
//been bid on
function getSuggestedItems(user_fbid, users) {
    // bids that have already been made by the user
    var bids = getUser(user_fbid, users).bids;

    var query = "u" + user_fbid;

    var rootNode = cy.getElementById(query);

    var dijkstra = cy.elements().dijkstra(rootNode, function(edge) {
        var weight = edgeWeights[edge.id()];
        return weight;
    }, false);

    var sortedItems = []

    //FIND LENGTH OF PATH TO ALL ITEMS
    cy.nodes().forEach(function(ele) {
        var indicator = ele.id().charAt(0);
        var id = ele.id().substring(1, ele.id().length);
        if (indicator == 'i') {
            //only add item if the item hasn't been bid on by the user
            var alreadyBidOn = false;
            for (var i = 0; i < bids.length; i++) {
                var previousItem = bids[i].itemID;
                if (previousItem == id) {
                    alreadyBidOn = true;
                    break;
                }
            }
            if (!alreadyBidOn) {
                var itemNode = cy.getElementById(ele.id());
                var length = dijkstra.distanceTo(itemNode)
                var struct = {
                    weight: length,
                    itemID: id
                }
                sortedItems.push(struct);
            }
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
        else {
            console.log('Edge with weight: ' + edgeWeights[path[i].id()]);
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