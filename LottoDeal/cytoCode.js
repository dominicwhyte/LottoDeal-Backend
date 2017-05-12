var cytoscape = require('cytoscape');


var cy = cytoscape({});

var stringSimilarity = require('string-similarity');
var edgeWeights = {};
var MAX_NUMBER_OF_SIMILARITIES_TO_RETURN = 3 //Change to alter the number suggestions to show on the website

//Computes the suggestions for userID, called back in callback. Takes in the User and Item schemas
exports.computeSimilarities = function(userID, User, Item, callback) {
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
                        var suggestions = getSuggestedItems(userID, users);
                        printSuggestions(users, items, suggestions);
                        var suggestionItems = getItemsFromStructs(suggestions.suggestions, items);
                        callback(selectItems(suggestionItems));
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

//slices suggestedItems and removes sold/expired ones
function selectItems(suggestedItems) {
    var selectedSuggestedItems = []
    var count = 0;
    for (var j = 0; j < suggestedItems.length; j++) {
        var item = suggestedItems[j];
        if ((item != null) && (item != undefined) && !item.expired && !item.sold) {
            selectedSuggestedItems.push(item);
            count++;
        }
        if (count >= MAX_NUMBER_OF_SIMILARITIES_TO_RETURN) {
            break;
        }
    }
    return selectedSuggestedItems;
}

// ADD VERTICES AND EDGES FOR ITEMS
function addItemVerticesAndEdges(items) {
    for (var i = 0; i < items.length; i++) {
        cy.add({
                group: "nodes",
                data: {
                    id: String("i" + items[i]._id)
                }
            } 
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

//These can be changed to alter the suggestions algorithm, to place more emphasis on different variables
var ITEM_SIMILARITY_MULTIPLIER = 2;
var USER_GENDER_DISPARITY_MULTIPLIER = 2;
var BID_MUTLIPLIER = 3;
var TITLE_MULTIPLIER = 3;

// COMPUTE THE EDGE WEIGHTS FOR THE GRAPH
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
            edgeWeights[edge] = similarity;
        }
    }
}


//Compute the shortest paths for user_fbid. Only include items that have not already
//been bid on
function getSuggestedItems(user_fbid, users) {
    // bids that have already been made by the user
    var foundUser = getUser(user_fbid, users)
    if (foundUser == null) {
        var struct = {
            suggestions: [],
            dijkstra: null
        }
        return struct;
    }

    var bids = foundUser.bids;

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

//Gets the items for the given struct from getSuggestedItems. Ok since constant
//number of items in struct
function getItemsFromStructs(struct, items) {
    var itemsToReturn = []
    for (var i = 0; i < struct.length; i++) {
        var itemID = struct[i].itemID
        var item = getItem(itemID, items);
        if (item != null) {
            itemsToReturn.push(item);
        }
    }
    return itemsToReturn;
}

//Prints the cy graph. Note that function use should be avoided in production code
function printSuggestions(users, items, suggestionsStruct) {
    printGraph(users, items);
    var suggestions = suggestionsStruct.suggestions
    var dijkstra = suggestionsStruct.dijkstra

    console.log('------------Print Suggestions----------------');

    for (var i = 0; i < suggestions.length; i++) {
        var itemStruct = suggestions[i];
        var item = getItem(itemStruct.itemID, items);
        if (item != null && item != undefined) {
            console.log('Weight from user: ' + itemStruct.weight + ": " + item.title)
            printPathToItem(item._id, dijkstra, users, items);
        }
        console.log();
    }

    console.log('------------End Print Suggestions----------------');
}

//Prints out a path dijkstra to an item with itemID, printing out just the nodes along with edges weights.
function printPathToItem(itemID, dijkstra, users, items) {
    var itemNode = cy.getElementById('i' + itemID);
    var path = dijkstra.pathTo(itemNode)
    for (var i = 0; i < path.length; i++) {
        var indicator = path[i].id().charAt(0);
        var id = path[i].id().substring(1, path[i].id().length);

        //skip over the edges in the path, just look at nodes
        if (!(path[i].id().indexOf(',') > -1)) {
            console.log(getNameOfID(path[i].id(), users, items));
        } else {
            console.log('Edge with weight: ' + edgeWeights[path[i].id()]);
        }
    }
}

//PARSE AN ENCODED STRING FROM THE GRAPH, RETURNS ITEM OR USER IN STRING FORMAT
function getNameOfID(encodedID, users, items) {
    var indicator = encodedID.charAt(0);
    var id = encodedID.substring(1, encodedID.length);
    if (indicator == 'u') {
        var user = getUser(id, users);
        if (user == null) {
            return "";
        }
        return "FBID:   " + user.fbid + '           User: ' + user.fullName
    } else if (indicator == 'i') {
        var item = getItem(id, items);
        if (item == null) {
            console.log('Item is null error');
            return "";
        }
        return "ItemID: " + item._id + "   Item: " + item.title
    }
}

//Prints out the graph in a user readable format
function printGraph(users, items) {
    console.log('------------Begin printing Graph----------------');

    cy.nodes().forEach(function(ele) {
        console.log(getNameOfID(ele.id(), users, items));
    });
    console.log('------------End printing Graph----------------');
}



//Gets an item from an itemID. Note that function use should be avoided in production code
function getItem(itemID, items) {
    for (var i = 0; i < items.length; i++) {
        if (items[i]._id == itemID) {
            return items[i];
        }
    }
    return null;
}

//Gets a user from an fbid. Note that function use should be avoided in production code
function getUser(fbid, users) {
    for (var i = 0; i < users.length; i++) {
        if (users[i].fbid == fbid) {
            return users[i];
        }
    }
    return null;
}