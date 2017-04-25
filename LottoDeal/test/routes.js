var should = require('should'); 
var assert = require('assert');
var request = require('supertest');  
var mongoose = require('mongoose');
var winston = require('winston');
var config = require('./config-debug');

var db = 'mongodb://localhost:27017/LottoDeal';
var url = "https://localhost:8000"
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

describe('Database connection', function() {
    // within before() you can run all the operations that are needed to setup your tests. In this case
  // I want to create a connection with the database, and when I'm done, I call done().
  before(function(done) {
    // In our tests we use the test db
    mongoose.connect(db, function(error) {
      if (error) console.error("Error while connecting:\n%\n", error);
      console.log("connected");
      done(error);
    });							
    // done();
  });
  // use describe to give a title to your test suite, in this case the tile is "Account"
  // and then specify a function in which we are going to declare all the tests
  // we want to run. Each test starts with the function it() and as a first argument 
  // we have to provide a meaningful title for it, whereas as the second argument we
  // specify a function that takes a single parameter, "done", that we will use 
  // to specify when our test is completed, and that's what makes easy
  // to perform async test!
  describe('User creation', function() {
    it('should properly create a new user', function(done) {
      var profile = {
        name: 'john doe',
        id: '12345',
        url: 'www.someurl.com',
        email: 'example@example.com'
      }

      // console.log(profile);
      // console.log(url)

      request(url)
      .post('/createUser')
      .send(profile)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.status.should.be.equal(200);
        res.text.should.be.equal("User already exists")
        console.log(res);
        done();
      });
    })
  });
});