$(document).ready(function() {
    $(".button-collapse").sideNav();

    $('select').material_select();

    $('.itemreviewform').submit(function (event) {
        event.preventDefault();
        var $form = $( this ),
            id = $form.attr('id'),
            val = $('#selectreviewdecision' + id + ' option:selected').val(),
            url = $form.attr( "action" );
        var posting = $.post( url, {reviewdecision: val} );
        posting.done(function( data ) {
            if(val == "hide") {
                $('#submitreviewdecision'+id).html('Hidden');
            }
            else if(val == "show") {
                $('#submitreviewdecision'+id).html('Buffered');
            }
            else if(val == "review") {
                $('#submitreviewdecision'+id).html('In Review');
            }
            $('#submitreviewdecision'+id).prop('disabled', 'true');
        });
        return false;
    });

    $('#edititemform').submit(function (event) {
        event.preventDefault();
        var $form = $( this ),
            val = $('#edititemtext').val(),
            url = $form.attr( "action" );
        var posting = $.post( url, {caption: val} );
        posting.done(function( data ) {
            $('#edititembutton').html('Updated');
            $('#edititembutton').prop('disabled', 'true');
        });
        return false;
    });

    $('ul.tabs').tabs();

    document.getElementById('dashboardtabs')
        .setAttribute("style", "width: 100%;");

    $('#dashboardtabs').css({padding: '0px'});

});
