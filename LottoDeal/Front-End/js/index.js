var app = angular.module("index_app", [])

app.controller("indexController", function($scope) {
	$scope.selectedTab = 0

	$scope.posts = []

	var url = "https://localhost:8000/getPosts";


    console.log('test')

    // AJAX POST TO SERVER
    $.ajax({
    	url: url,
    	type: 'GET',
    	success: function(data) {
            var items = JSON.parse(data)
            $scope.posts = items;
            console.log($scope.posts)
            $("button[buttonType='bidButton']").click(function(e) {
        console.log(this)

        idattr = this.attr("id");
        console.log(idattr)
    })




            $scope.$apply()
    	},
    	error: function(response, error) {
    		console.log(response)
    		console.log(error)
    	}
    });

    $("button[buttonType='bidButton']").click(function(e) {
        console.log(this)

        idattr = this.attr("id");
        console.log(idattr)
    })



    $scope.bid = function (event) {
        console.log(event)



    }

})	

 $("button[buttonType='bidButton']").click(function(e) {
        console.log(this)

        idattr = this.attr("id");
        console.log(idattr)
    })

// /* Create Tabs */

// $(document).ready(function(){
//     $("#login").click(function(){
//         $(".content").load("./login.html .content");
//         console.log("here");
//         return false;
//     });

//     $("#about").click(function(){
//         $(".content").load("./about.html .content");
//         return false;
//     });

//     $("#sell").click(function(){
//         $(".content").load("./sell.html .content");
//         return false;
//     });

//     $("#contact").click(function(){
//         $(".content").load("./contact.html .content");
//         return false;
//     });

//     $("#home").click(function(){
//         $(".content").load("./index.html .content");
//         return false;
//     });
// });
