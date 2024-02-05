const socket = io();

const videoChatForm = document.getElementById('video-chat-form');
const videoChatRoom = document.getElementById('video-chat-rooms')
const roomInput = document.getElementById('roomName');
const joinButton = document.getElementById('join')
const userVideo = document.getElementById('user-video')
const peerVideo = document.getElementById('peer-video');
const btnContainer = document.getElementById('btn-container');
const muteButton = document.getElementById('mute-btn');
const leaveRoomButton = document.getElementById('leave-room-btn');
const hideCameraButton = document.getElementById('hide-camera-btn');

var muteFlag = false;
var hideFlag = false;

var roomName;
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
var creator = false;

// To globally access the stream
var userStream;

// used to get  public IP from stun server 
var iceServers = {

    iceServers: [
        { urls: "stun:stun.services.mozilla.com" },
        { urls: "stun:stun.l.google.com:19302" }
    ]

};

var rtcPeerConnection;


joinButton.addEventListener('click', () => {
    if (roomInput.value === '') {
        alert('Enter Room Name');
    } else {
        // Update the roomName variable with the current input value
        roomName = roomInput.value;
        // crate socket event to make room
        socket.emit('join', roomName);
        videoChatForm.style.display = 'none';
        videoChatRoom.style.display = 'flex';
        btnContainer.style.display = 'none';
    }
})

// mute feature
muteButton.addEventListener('click', () => {
    // Toggle the mute button
    muteFlag = !muteFlag;
    if (muteFlag) {
        userStream.getTracks()[0].enabled = false
        muteButton.textContent = 'unmute';
    } else {
        muteButton.textContent = 'mute';
        userStream.getTracks()[0].enabled = true;
    }
    // Emit the mute event
    socket.emit('mute', muteFlag, roomName);
});

// hide camera feature
hideCameraButton.addEventListener('click', () => {
    hideFlag = !hideFlag
    if (hideFlag) {
        userStream.getTracks()[1].enabled = false;
        hideCameraButton.textContent = "show Camera "
    } else {
        hideCameraButton.textContent = "hide Camera"
        userStream.getTracks()[1].enabled = true;
    }
});

// leave room feature
leaveRoomButton.addEventListener('click', () => {
    // event to leave
    socket.emit('leave', roomName);

    videoChatForm.style.display = 'block'; // Show video-chat-form
    videoChatRoom.style.display = 'none'; // Hide video-chat-rooms
    btnContainer.style.display = 'none'; // Hide btn-container

    if (userVideo.srcObject) {
        userVideo.srcObject.getTracks()[1].stop();
        userVideo.srcObject.getTracks()[0].stop();
    }

    if (peerVideo.srcObject) {
        peerVideo.srcObject.getTracks()[0].stop();
        peerVideo.srcObject.getTracks()[1].stop();
    }

    if (rtcPeerConnection) {
        rtcPeerConnection.ontrack = null;
        rtcPeerConnection.onicecandidate = null;
        rtcPeerConnection.close();
    }

});

socket.on('leaved', () => {
    //assing host 
    creator = true;

    if (peerVideo.srcObject) {
        peerVideo.srcObject.getTracks()[0].stop();
        peerVideo.srcObject.getTracks()[1].stop();
    }

    if (rtcPeerConnection) {
        rtcPeerConnection.ontrack = null;
        rtcPeerConnection.onicecandidate = null;
        rtcPeerConnection.close();
    }
})


socket.on('created', () => {
    creator = true;
    navigator.getUserMedia(
        {
            audio: true,
            video: true
        },
        function (stream) {
            // video stream
            videoChatForm.style = "display:block";
            btnContainer.style = "display:flex";
            userStream = stream; // access stream to global use
            userVideo.srcObject = stream;

            userVideo.onloadedmetadata = function (e) {
                userVideo.play();
            }
        },
        function (err) {
            alert("something went wrong");
        }
    )
});

socket.on('joined', () => {
    creator = false;

    navigator.getUserMedia(
        {
            audio: true,
            video: true
        },
        function (stream) {
            // video stream
            userStream = stream;
            videoChatForm.style.display = 'none';
            btnContainer.style.display = 'flex';
            userVideo.srcObject = stream;
            userVideo.onloadedmetadata = function (e) {
                userVideo.play();
            }
            // after stream
            socket.emit('ready', roomName)
        },
        function (err) {
            alert("Room is full . can't join");
        }
    )
});

socket.on('full', (data) => {
    alert(data.message);
});

// another person for ready state emiited only for the joined user
socket.on('ready', () => {

    if (creator) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidateFunction;
        rtcPeerConnection.ontrack = onTrackFunction;
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream); // 0 index audio 
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream); // 1 index video
        rtcPeerConnection.createOffer(
            function (offer) {
                rtcPeerConnection.setLocalDescription(offer);
                socket.emit('offer', offer, roomName);
            },
            function (err) {
                console.log(err)
            }
        );
    }

})
socket.on('candidate', (candidate) => {
    var iceCandidate = new RTCIceCandidate(candidate);
    rtcPeerConnection.addIceCandidate(iceCandidate);
})

// event who is receving the call 
socket.on('offer', (offer) => {

    if (!creator) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidateFunction;
        rtcPeerConnection.ontrack = onTrackFunction;
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream); // 0 index audio 
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream); // 1 index video
        rtcPeerConnection.setRemoteDescription(offer);
        rtcPeerConnection.createAnswer(
            function (answer) {
                rtcPeerConnection.setLocalDescription(answer);
                socket.emit('answer', answer, roomName);
            },
            function (err) {
                console.log(err);
            }
        );
    }

});

socket.on('answer', (answer) => {
    rtcPeerConnection.setRemoteDescription(answer);
})

function onIceCandidateFunction(e) {

    if (e.candidate) {
        // event for the receiver candidate who will join the room
        socket.emit('candidate', e.candidate, roomName);
    }
}

function onTrackFunction(e) {
    // access the stream from event and in the first index of array the audio and video is availabel in streams array
    peerVideo.srcObject = e.streams[0];
    peerVideo.onloadedmetadata = function (e) {
        peerVideo.play();
    }
}

