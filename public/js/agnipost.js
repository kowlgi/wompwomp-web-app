$(document).ready(function() {
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

    $('#videocaption').keyup(function(){
        $('#videoblahtxt').html($(this).val());
    });

    $('textarea#imagefile').characterCounter();

    function humanFileSize(bytes, si) {
        var thresh = si ? 1000 : 1024;
        if(bytes < thresh) return bytes + ' B';
        var units = si ? ['kB','MB','GB','TB','PB','EB','ZB','YB'] : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
        var u = -1;
        do {
            bytes /= thresh;
            ++u;
        } while(bytes >= thresh);
        return bytes.toFixed(1)+' '+units[u];
    }
    // https://scotch.io/tutorials/use-the-html5-file-api-to-work-with-files-locally-in-the-browser
    //this function is called when the input loads a video
    function renderVideo(event){
        var reader = new FileReader();
        var file = event.target.files[0];
        reader.onload = function(evt){
            var the_url = evt.target.result;
            //of course using a template library like handlebars.js is a better solution than just inserting a string
            $('#data-vid').html("<video class='responsive-video' controls><source id='vid-source' src='"+the_url+"' type='video/mp4'></video>")
            $('#size-vid').html(humanFileSize(file.size, "MB"))

            addVideoEventListener();
        }
        //when the file is read it triggers the onload event above.
        reader.readAsDataURL(file);
    }

    document.getElementById('videofile').addEventListener('change', renderVideo, false);

    var canvas = document.querySelector('canvas');
    var video;
    // Get a handle on the 2d context of the canvas element
    var context = canvas.getContext('2d');
    function addVideoEventListener() {
        //http://html5multimedia.com/code/ch9/video-canvas-screenshot.html
        // Get handles on the video and canvas elements
        video = document.querySelector('video');

        // Add a listener to wait for the 'loadedmetadata' state so the video's dimensions can be read
        video.addEventListener('loadedmetadata', function() {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            document.getElementById("takescreenshotbutton").disabled = false;
        }, false);
    }

    // Takes a snapshot of the video
    $('#takescreenshotbutton').click(function(){
        // Define the size of the rectangle that will be filled (basically the entire element)
        context.fillRect(0, 0, canvas.width, canvas.height);
        // Grab the image from the video
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        document.getElementById("videosubmitbutton").disabled = false;
    });

    //http://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata
    function dataURItoBlob(dataURI) {
        // convert base64/URLEncoded data component to raw binary data held in a string
        var byteString;
        if (dataURI.split(',')[0].indexOf('base64') >= 0)
            byteString = atob(dataURI.split(',')[1]);
        else
            byteString = unescape(dataURI.split(',')[1]);

        // separate out the mime component
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

        // write the bytes of the string to a typed array
        var ia = new Uint8Array(byteString.length);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        return new Blob([ia], {type:mimeString});
    }

    $('#uploadvideoform').submit(function(event) {
        $('#spinner').css({display: 'block'});
        event.preventDefault();
        var form = $(this),
            standardform = document.getElementById("uploadvideoform"),
            URL = form.attr( "action" );
        var KEY = document.getElementById("videofilename").value;
        document.getElementById("videofilename").value = "video/" + KEY + ".mp4";
        var FD = new FormData(standardform);
        var thumbnailData = canvas.toDataURL('image/jpeg');
        $.ajax({
            url: URL,
            data: FD,
            processData: false,
            contentType: false,
            type: 'POST',
            success: function(){
                var FD1 = new FormData();
                FD1.append('key', "video/" + KEY + ".jpg");
                FD1.append('file', dataURItoBlob(thumbnailData));
                $.ajax({
                    url: URL,
                    data: FD1,
                    processData: false,
                    contentType: false,
                    type: 'POST',
                    success: function(){
                        var posting = $.post("/postvideo", {id: KEY, caption: document.getElementById("videocaption").value});
                        posting.done(function(response){
                            $('#spinner').css({display: 'none'});
                            $("body").html(response);
                        });
                        posting.error(function(){
                            $('#spinner').css({display: 'none'});
                            alert("Error uploading video. Please try again");
                        });
                    },
                    error: function() {
                        $('#spinner').css({display: 'none'});
                        alert("Error uploading video. Please try again");
                    }
                });
            },
            error: function() {
                $('#spinner').css({display: 'none'});
                alert("Error uploading video. Please try again");
            }
        });
        return false;
    });
});
