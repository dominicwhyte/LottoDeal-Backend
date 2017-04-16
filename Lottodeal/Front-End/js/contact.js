function sendEmail() {
// 	var postmark = require("postmark");
// // Example request
// var client = new postmark.Client("27c10544-6caa-46b9-8640-67b000036be3");

// client.sendEmail({
// 	"From": "dwhyte@princeton.edu",
// 	"To": "dwhyte@princeton.edu",
// 	"Subject": "Test", 
// 	"TextBody": "Hello from Postmark!"
// });	
console.log('testemail')
emailjs.send("lotto_deal", "sample_template", {"email":"dwhyte@princeton.edu"})
}