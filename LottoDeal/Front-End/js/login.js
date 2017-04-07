var app = angular.module("login_app", []); // put any module dependencies here ["ngRoute"]

console.log('Test');



// app.config(function($routeProvider)) { can put routing here}
window.fbAsyncInit = function() {
    FB.init({
      appId      : '228917890846081',
      xfbml      : true,
      version    : 'v2.8'
  });

    //FB.AppEvents.logPageView();
};

(function(d, s, id){
 var js, fjs = d.getElementsByTagName(s)[0];
 if (d.getElementById(id)) {return;}
 js = d.createElement(s); js.id = id;
 js.src="https://connect.facebook.net/en_US/all.js";
 fjs.parentNode.insertBefore(js, fjs);

}(document, 'script', 'facebook-jssdk'));

function myFacebookLogin() {
    console.log('test3')
  FB.login(function(){}, {scope: 'publish_actions'});
}


console.log('test2')

app.controller("loginController", function($scope) {
	$scope.selectedTab = 0;

	// possible jquery tab selection here
	
})



 //   FB.getLoginStatus(function(response) {
 //      if (response.status === 'connected') {
 //        console.log('Logged in.');
 //        $("#fbButton").hide();
 //    }
 //    else {
 //     console.log('Not logged in')
 //     FB.login();
 // }}
 // );