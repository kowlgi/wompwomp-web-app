$(document).ready(function() {
    var heightInPixels = String($('#installsubscribe').height())+"px";
    document.getElementById('installsubscribe_placeholder')
        .setAttribute("style","display:none"); /* Needed to set attributes */
    document.getElementById('installsubscribe_placeholder')
        .style.height=heightInPixels;

    var triggerPosition = $('#installsubscribe').offset().top;
    $(window).scroll(function()
    {
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

    $('.modal-trigger').leanModal();
});
