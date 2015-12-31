$(document).ready(function() {
    $(".button-collapse").sideNav();

    function readURL(input) {
        if (input.files && input.files[0]) {
            var reader = new FileReader();

            reader.onload = function (e) {
                $('#blahimg').attr('src', e.target.result);
            }

            reader.readAsDataURL(input.files[0]);
        }
    }

    $("#imagefile").change(function(){
        readURL(this);
    });

    $('#caption').keyup(function(){
        $('#blahtxt').html($(this).val());
    });

    $('textarea#imagefile').characterCounter();

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

    $('ul.tabs').tabs();

    document.getElementById('dashboardtabs')
        .setAttribute("style", "width: 100%;");

    $('#dashboardtabs').css({padding: '0px'});

});
