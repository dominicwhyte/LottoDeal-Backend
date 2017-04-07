var app = angular.module("app", []);

app.controller("sellController", function($scope, $http) {
	console.log("got here")

    $("#submitForm").submit(function(e) {
    	console.log("got here")
	    e.preventDefault();

    	var url = "https://localhost:8000/createPost";

	    var price = $("#price").val()
	    var title = $("#title").val()
	    var description = $("#description").val()
	    var date = $("#expirDate").val()
	    var pictureURL = $("#pictureURL").val()

	    data = {
	    	price: price,
	    	title: title,
	    	description: description,
	    	expirationDate: date,
	    	pictureURL: pictureURL
	    }

	    // AJAX POST TO SERVER
	    $.ajax({
		    url: url,
		    type: 'post',
		    data: data,
		    success: function(data) {
				console.log(data)
		    },
		    error: function(response, error) {
				console.log(response)
				console.log(error)
		    }
		});

	});
})

