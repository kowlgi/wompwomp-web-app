$(document).ready(function() {
    setupGoogleAnalytics();

    var heightInPixels = String($('#installsubscribe').height())+"px";
    document.getElementById('installsubscribe_placeholder')
        .setAttribute("style","display:none"); /* Needed to set attributes */
    document.getElementById('installsubscribe_placeholder')
        .style.height=heightInPixels;

    var triggerPosition = $('#installsubscribe').offset().top;
    function updatePosition() {
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
    }
    var throttled = _throttle(updatePosition, 25);
    $(window).scroll(throttled);

    $('.modal-trigger').leanModal({
      dismissible: true, // Modal can be dismissed by clicking outside of the modal
      opacity: .7, // Opacity of modal background
      in_duration: 300, // Transition in duration
      out_duration: 300, // Transition out duration}
    }); //

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

  // underscore.js:
  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _throttle = function(func, wait, options) {
    var timeout, context, args, result;
    var previous = 0;
    if (!options) options = {};

    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };

    var throttled = function() {
      var now = _now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };

    throttled.clear = function() {
      clearTimeout(timeout);
      previous = 0;
      timeout = context = args = null;
    };

    return throttled;
  };

    // underscore.js:
    // A (possibly faster) way to get the current timestamp as an integer.
  _now = Date.now || function() {
    return new Date().getTime();
  };

  function setupGoogleAnalytics() {
    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
        (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
        })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

    ga('create', 'UA-70087021-1', 'auto');
    ga('send', 'pageview');
  }
