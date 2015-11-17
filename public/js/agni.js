$(document).ready(function() {
    setupGoogleAnalytics();

    var heightInPixels = String($('#installsubscribe').height())+"px";
    document.getElementById('installsubscribe_placeholder')
        .setAttribute("style","display:none"); /* Needed to set attributes */
    document.getElementById('installsubscribe_placeholder')
        .style.height=heightInPixels;

    var triggerPosition = $('#installsubscribe').offset().top;
    $(window).scroll(function() {
        if( $(window).scrollTop() > triggerPosition )
        {
            $('#installsubscribe').addClass('fixed-top')
            $('#installsubscribe_placeholder').css({display: 'block'});
        }
        else
        {
            $('#installsubscribe').removeClass('fixed-top');
            $('#installsubscribe_placeholder').css({display: 'none'});
        }
    });

    $('.modal-trigger').leanModal({
      dismissible: true, // Modal can be dismissed by clicking outside of the modal
      opacity: .7, // Opacity of modal background
      in_duration: 300, // Transition in duration
      out_duration: 300, // Transition out duration}
    }); 

    // disable email subscribe button by default and enable when the input
    // field has some text
    $('.modal-trigger').click( function(){
        $('#subscribebutton').prop('disabled', true);
        $('#subscribebutton').html('Subscribe');
        $('#emailfield').val('');
    })

    $('#emailfield').bind("change keyup input", function(){
        $('#subscribebutton').prop('disabled', this.value == "" ? true : false);
    });

    $('.subscribeform').submit(function (event) {
        event.preventDefault();
        var $form = $( this ),
            term = $('#emailfield').val(),
            url = $form.attr( "action" );
        var posting = $.post( url, {email: term} );
        posting.done(function( data ) {
            $('#subscribebutton').html('Done!');
            $('#subscribebutton').prop('disabled', 'true');
            setTimeout(function(){
                $('#subscribemodal').closeModal();
            }, 2000);
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
