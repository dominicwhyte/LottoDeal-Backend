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
