
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
            getFbUserData();
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


// Facebook login with JavaScript SDK
function fbLogin() {


    var window = FB.login(function (response) {
        if (response.authResponse) {
            // Get and display the user profile data
            document.getElementById('fbLink').setAttribute("onclick","fbLogout()");
            document.getElementById('fbLink').innerHTML = 'Facebook Logout';
            getFbUserData();
            window.focus();
        } else {
            document.getElementById('status').innerHTML = 'User cancelled login or did not fully authorize.';
        }
    }, {scope: 'email'});
}

function saveUserData(response) {

      var url = "https://localhost:8000/createUser";

      data = {
        name: response.first_name+ ' ' + response.last_name,
        fbid: response.id,
        url: response.picture.data.url
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
}

// Fetch the user profile data from facebook
function getFbUserData(){
    FB.api('/me', {locale: 'en_US', fields: 'id,first_name,last_name,email,link,gender,locale,picture'},
        function (response) {
            document.getElementById('status').innerHTML = 'Thanks for logging in, ' + response.first_name + '!';
            document.getElementById('userData').innerHTML = '<p><b>FB ID:</b> '+response.id+'</p><p><b>Name:</b> '+response.first_name+' '+response.last_name+'</p><p><b>Email:</b> '+response.email+'</p><p><b>Gender:</b> '+response.gender+'</p><p><b>Locale:</b> '+response.locale+'</p><p><b>Picture:</b> <img src="'+response.picture.data.url+'"/></p><p><b>FB Profile:</b> <a target="_blank" href="'+response.link+'">click to view profile</a></p>';

            localStorage.setItem("curUserID", response.id);
            // Save user data
            saveUserData(response);
        });
}

// Logout from facebook
function fbLogout() {

    //delete local storage
    delete localStorage.curUserID;

    FB.logout(function() {
        document.getElementById('fbLink').setAttribute("onclick","fbLogin()");
        document.getElementById('fbLink').innerHTML = 'Facebook Login';
        document.getElementById('userData').innerHTML = '';
        document.getElementById('status').innerHTML = 'You have successfully logout from Facebook.';
    });
}


var app = angular.module("app", []);

app.controller("loginController", function($scope) {
	$scope.selectedTab = 0;

	// possible jquery tab selection here
	
});


