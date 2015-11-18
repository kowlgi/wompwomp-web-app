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

    $(".card-content").each(function() {
        var uniqueID = this.id;
        if(docCookies.hasItem(uniqueID)){
            $('#favoriteicon'+uniqueID).removeClass('text-lighten-5');
        }

        document.getElementById('favorite'+uniqueID).onclick = function(event){
            event.preventDefault();
            if(!docCookies.hasItem(uniqueID)) {
                docCookies.setItem(uniqueID, "");
                $('#favoriteicon'+uniqueID).removeClass('text-lighten-5');
            }
            else {
                docCookies.removeItem(uniqueID);
                $('#favoriteicon'+uniqueID).addClass('text-lighten-5');
            }
            return false;
        }
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

/*\
|*|
|*|  :: cookies.js ::
|*|
|*|  A complete cookies reader/writer framework with full unicode support.
|*|
|*|  Revision #1 - September 4, 2014
|*|
|*|  https://developer.mozilla.org/en-US/docs/Web/API/document.cookie
|*|  https://developer.mozilla.org/User:fusionchess
|*|
|*|  This framework is released under the GNU Public License, version 3 or later.
|*|  http://www.gnu.org/licenses/gpl-3.0-standalone.html
|*|
|*|  Syntaxes:
|*|
|*|  * docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
|*|  * docCookies.getItem(name)
|*|  * docCookies.removeItem(name[, path[, domain]])
|*|  * docCookies.hasItem(name)
|*|  * docCookies.keys()
|*|
\*/

var docCookies = {
  getItem: function (sKey) {
    if (!sKey) { return null; }
    return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
  },
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
    var sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toUTCString();
          break;
      }
    }
    document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
    return true;
  },
  removeItem: function (sKey, sPath, sDomain) {
    if (!this.hasItem(sKey)) { return false; }
    document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "");
    return true;
  },
  hasItem: function (sKey) {
    if (!sKey) { return false; }
    return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  },
  keys: function () {
    var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
    for (var nLen = aKeys.length, nIdx = 0; nIdx < nLen; nIdx++) { aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]); }
    return aKeys;
  }
};
