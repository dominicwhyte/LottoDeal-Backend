var app = angular.module("index_app", [])

app.controller("indexController", function($scope) {
	$scope.selectedTab = 0

	/* Create Tabs */
    $(document).ready(function(){
        $("#login").click(function(){
            $(".content").load("./login.html .content");
            console.log("here");
            return false;
        });
    });

    $(document).ready(function(){
        $("#about").click(function(){
            $(".content").load("./about.html .content");
            return false;
        });
    });

    $(document).ready(function(){
        $("#sell").click(function(){
            $(".content").load("./sell.html .content");
            return false;
        });
    });

    $(document).ready(function(){
        $("#contact").click(function(){
            $(".content").load("./contact.html .content");
            return false;
        });
    });

    $(document).ready(function(){
        $("#home").click(function(){
            $(".content").load("./index.html .content");
            return false;
        });
    });

})

