$(document).ready(function() {
    setupGoogleAnalytics();
    
    /* Button logic for /subcribe */
    $('#subscribepagebutton').prop('disabled', true);

    $('#subscribepageemailfield').bind("change keyup input", function(){
        $('#subscribepagebutton').prop('disabled', this.value == "" ? true : false);
    });

    $('.subscribepageform').submit(function (event) {
        event.preventDefault();
        var $form = $( this ),
            term = $('#subscribepageemailfield').val(),
            url = $form.attr( "action" );
        var posting = $.post( url, {email: term} );
        posting.done(function( data ) {
            $('#subscribepagebutton').html('Done!');
            $('#subscribepagebutton').prop('disabled', 'true');
        });
        return false;
    });
});

function setupGoogleAnalytics() {
    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
        (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
        })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

    ga('create', 'UA-70087021-1', 'auto');
    ga('send', 'pageview');
}
