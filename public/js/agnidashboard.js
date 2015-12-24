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
});
