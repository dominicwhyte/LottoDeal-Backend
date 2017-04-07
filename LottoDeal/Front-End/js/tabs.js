// Wait for the page to load first
window.onload = function() {

    //Get a reference to the link on the page
    // with an id of "mylink"
    var content = document.getElementById("loginElements");

    //Set code to run when the link is clicked
    // by assigning a function to "onclick"
    content.onclick = function() {

        function showonlyone(thechosenone) {
            $('.newboxes').each(function(index) {
                if ($(this).attr("id") == thechosenone) {
                    $(this).show(200);
                }
                else {
                    $(this).hide(600);
                }
            });
        }
        return false;
    }
}
