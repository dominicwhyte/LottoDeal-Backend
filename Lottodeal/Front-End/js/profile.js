var app = angular.module("profile_app", ["ngRoute"])


app.controller("profileController", ["$scope", "$rootScope", "$location", function($scope, $rootScope, $location) {
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
            for (i = 0; i < items.length; i++) {
                items[i].percentageRaised = (Number(items[i].amountRaised) / Number(items[i].price)) * 100;
                console.log( "Raised" + items[i].percentageRaised);
                var expirationDate = new Date(items[i].expirationDate);
                var date = new Date();
                items[i].expirationDate = DateDiff.inHours(date, expirationDate) + " Hours " + DateDiff.inDays(date, expirationDate) + " Days left";
            }
            $scope.posts = items;
            console.log($scope.posts)
            $scope.$apply()
        },
        error: function(response, error) {
          console.log(response)
          console.log(error)
      }
    });
    

    $scope.targetPost = null;



    $scope.bid = function (event, amount, amountRaised, price) {
        // DISPLAY BID ON FRONT-END
        var progressbar = $("#progress-bar-" + event)
        // console.log(progressbar)
        var currentAmount = progressbar.css("width")
        // console.log(currentAmount)
        var totalWidth = (parseInt(currentAmount.substring(0, currentAmount.length - 2)) * parseInt(price)) / parseInt(amountRaised)
        var percentage = progressbar.width() / progressbar.parent().width() * 100
        var newAmount = parseInt(amountRaised) + parseInt(amount)
        // console.log(newAmount)
        var newPercent = ((newAmount * 1.0) / (parseInt(price) * 1.0))
        // console.log(newPercent)
        // var newWidth = progressbar.parent().width() * newPercent
        var newWidth = totalWidth * newPercent
        // console.log("newwidth: " + newWidth)
        var pixelWidth = ""  + newWidth + "px"
        progressbar.css("width", pixelWidth)

        // change the amount raised
        var amountText = $("#amountRaised-" + event)
        // console.log(amountText)
        amountText.text("$" + newAmount + " of $" + price + " raised")




        // ADD BID TO DATABASE
        console.log("Adding bid for item " + event + " for " + amount)


        var url = "https://localhost:8000/addBid";
        var userID = localStorage.getItem("curUserID")
        if (userID != null) {
            data = {
               itemID: event,
               userID: userID,
               newAmount: Number(amount)
           }

           $.ajax({
            url: url,
            data: data,
            type: 'POST',
            success: function(data) {
                console.log('Bid added for ' + event)
            },
            error: function(response, error) {
                console.log(response)
                console.log(error)
            }
        });

       }
       else {
        console.log('UserID is null')
    }

}

}])	












// For Facebook login

// Facebook Javascript SDK configuration and setup
window.fbAsyncInit = function() {
    FB.init({
      appId      : '228917890846081',
      xfbml      : true,
      cookie     : true,
      version    : 'v2.8'
  });

    // Check whether the user already logged in
    FB.getLoginStatus(function(response) {
        if (response.status === 'connected') {
            //display user data
            displayFBUserData();
            // Get and display the user profile data
            document.getElementById('fbLink').setAttribute("onclick","fbLogout()");
            document.getElementById('fbLink').innerHTML = 'Facebook Logout';
        }
        else {
            console.log('Not logged in');
        }
    });
};

// Load the Javascript SDK asynchronously

(function(d, s, id){
 var js, fjs = d.getElementsByTagName(s)[0];
 if (d.getElementById(id)) {return;}
 js = d.createElement(s); js.id = id;
 js.src="https://connect.facebook.net/en_US/all.js";
 fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));


// Fetch the user profile data from facebook
function displayFBUserData(){
    FB.api('/me', {locale: 'en_US', fields: 'id,first_name,last_name,email,picture'},
        function (response) {
            document.getElementById('profileName').innerHTML = response.first_name + " " + response.last_name;
            document.getElementById('profileImage').src = response.picture.data.url;
            document.getElementById('profileImageBackground').src = response.picture.data.url;


            // Save user data
            saveUserData(response);
        });
}





