$(document).ready(function() {
    setupGoogleAnalytics();

    //http://stackoverflow.com/questions/10118172/setting-div-width-and-height-in-javascript
    var installHeightInPixels = String($('#install').height())+"px";
    document.getElementById('install_placeholder')
        .setAttribute("style","display:none;height:"+installHeightInPixels);
    document.getElementById('install_placeholder')
        .style.height = installHeightInPixels;
    document.getElementById('install_placeholder')
        .style.display = "none";

    var subscribeHeightInPixels = String($('#subscribe').height())+"px";
    document.getElementById('subscribe_placeholder')
        .setAttribute("style","display:none;height:"+subscribeHeightInPixels);
    document.getElementById('subscribe_placeholder')
        .style.height = subscribeHeightInPixels;
    document.getElementById('subscribe_placeholder')
        .style.display = "none";

    //var triggerPosition = $('#install').offset().top;
    var SHOW_CTA_POSITION = 3000;
    $(window).scroll(function() {
        if( $(window).scrollTop() > SHOW_CTA_POSITION)
        {
            $('#install').addClass('fixed-top');
            $('#install_placeholder').css({display: 'block'});

            $('#subscribe').addClass('fixed-bottom');
            $('#subscribe_placeholder').css({display: 'block'});
        }
        else
        {
            $('#install').removeClass('fixed-top');
            $('#install_placeholder').css({display: 'none'});

            $('#subscribe').removeClass('fixed-bottom');
            $('#subscribe_placeholder').css({display: 'none'});
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
