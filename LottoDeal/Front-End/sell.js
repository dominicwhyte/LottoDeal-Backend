var app = angular.module("app", [])

    app.controller("sellController", function($scope) {
	    $("#myform").submit(function(e) {

		    //prevent Default functionality
		    e.preventDefault();


        var actionurl = "http://104.236.12.104:8000/createPost"

		    var price = $("#price").val()
		    var title = $("#Title").val()
		    var description = $("#Description").val()

		    //do your own request an handle the results
		    $.ajax({
			    url: actionurl,
			    type: 'post',
			    dataType: 'json',
			    data: {
				price: price,
				title: title,
				description: description
			    },
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

