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
    

    $scope.bid = function (event, amount) {
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

})	

//Code modified from http://ditio.net/2010/05/02/javascript-date-difference-calculation/
var DateDiff = {

    inHours: function(d1, d2) {
        var t2 = d2.getTime();
        var t1 = d1.getTime();
        if (t2 == null || t1 == null) {
            return 0
        }
        return (parseInt((t2-t1)/(3600*1000))) % 24;
    },

    inDays: function(d1, d2) {
        var t2 = d2.getTime();
        var t1 = d1.getTime();
        if (t2 == null || t1 == null) {
            return 0
        }
        return parseInt((t2-t1)/(24*3600*1000));
    },
 
    // inWeeks: function(d1, d2) {
    //     var t2 = d2.getTime();
    //     var t1 = d1.getTime();
 
    //     return parseInt((t2-t1)/(24*3600*1000*7));
    // },
 
    // inMonths: function(d1, d2) {
    //     var d1Y = d1.getFullYear();
    //     var d2Y = d2.getFullYear();
    //     var d1M = d1.getMonth();
    //     var d2M = d2.getMonth();
 
    //     return (d2M+12*d2Y)-(d1M+12*d1Y);
    // },
 
    // inYears: function(d1, d2) {
    //     return d2.getFullYear()-d1.getFullYear();
    // }
}

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
