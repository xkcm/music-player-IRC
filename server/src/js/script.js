(async function() {
    async function requestSong(id) {
        return await new Promise(res => {
            var xhr = new XMLHttpRequest();
            xhr.responseType = 'blob';
            xhr.onload = () => res(xhr.response);
            xhr.open("GET", '/api/get_song/' + id);
            xhr.send(null);
        });
    }
    async function rawRequest(url) {
        return await new Promise(res => {
            var xhr = new XMLHttpRequest();
            xhr.onload = () => res(xhr.response);
            xhr.open("GET", url);
            xhr.send(null);
        })
    }

    function formatTime(t) {
        let m = parseInt(t / 60);
        let s = parseInt(t % 60);
        return `${m}m${s}s`
    }

    function _arrayBufferToBase64(buffer) {
        var binary = '';
        var bytes = new Uint8Array(buffer);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    var socket = io();

    const actionFunctions = new Map([
        ['PLAY/PAUSE', function() {
            if (playing) pause();
            else play();
        }],
        ['PREV', prevTrack],
        ['NEXT', nextTrack],
        ['VOL-', lowerVolume],
        ['VOL+', higherVolume],
        ['CH+', function() {
            changeTime(audio.currentTime + 10);
        }],
        ['CH-', function() {
            changeTime(audio.currentTime - 10);
        }],
        ['CH', function() {
            alert(formatTime(audio.currentTime));
        }]
    ])

    socket.on("IRC_VALUE", (action, raw) => {
        if (actionFunctions.has(action)) {
            actionFunctions.get(action)();
        }
    })

    var qr = q => document.querySelector(q);
    var qrall = q => document.querySelectorAll(q);

    var playButton = qr("#play-button"),
        progressBar = qr("#duration #progress"),
        progressContainer = qr("#duration"),
        nextButton = qr("#next"),
        prevButton = qr("#prev");

    var maxID = JSON.parse(await rawRequest('/api/max_id')).maxID;
    var currentID = parseInt(Math.random() * maxID);

    var audio = new Audio();
    loadTrack();

    var playing = false;

    audio.addEventListener("timeupdate", function() {
        let t = audio.currentTime;
        let perc = t / audio.duration;
        updateProgress(perc);
    })
    audio.addEventListener("ended", nextTrack);

    nextButton.addEventListener("click", nextTrack);
    prevButton.addEventListener("click", prevTrack);

    progressContainer.addEventListener("mousedown", e => {
        let perc = (e.clientX - progressContainer.getBoundingClientRect().x) / progressContainer.clientWidth;
        changeTime(perc * audio.duration);
    })

    playButton.addEventListener("click", function() {
        if (playing) {
            pause();
        } else {
            play();
        }
    })

    function changeTime(t) {
        let perc = t / audio.duration;
        audio.currentTime = parseInt(t);
        updateProgress(perc);
    }

    function updateProgress(perc) {
        progressBar.style.width = (perc * progressContainer.clientWidth) + 'px';
    }

    function play() {
        playing = true;
        audio.play();
        try {
            playButton.classList.remove('to-play');
            playButton.classList.add('to-pause');
        } catch (e) {}
    }

    function pause() {
        audio.pause();
        playing = false;
        try {
            playButton.classList.add('to-play');
            playButton.classList.remove('to-pause');
        } catch (e) {}
    }

    function nextTrack() {
        pause();
        currentID++;
        if (currentID > maxID) currentID = 0;
        loadTrack().then(play);
    }

    function prevTrack() {
        pause();
        currentID--;
        if (currentID < 0) currentID = maxID;
        loadTrack().then(play)
    }

    function lowerVolume(val = -0.05) {
        changeVolume(val)
    }

    function higherVolume(val = 0.05) {
        changeVolume(val);
    }

    function changeVolume(val) {
        let tempVolume = audio.volume + val;
        if (tempVolume < 0) tempVolume = 0;
        if (tempVolume > 1) tempVolume = 1;
        audio.volume = tempVolume;
    }

    function loadTrack(id) {
        return new Promise(resolve => {
            requestSong(id ? id : currentID).then(d => {
                audio.src = URL.createObjectURL(d);
                jsmediatags.read(d, {
                    onSuccess: function({ tags }) {
                        audio.tags = tags;
                        showData(tags);
                    }
                })
                resolve();
            })
        })
    }

    function showData(tags) {
        playButton.style.backgroundImage = `url(data:image/png;base64,${_arrayBufferToBase64(tags.picture.data)})`
        progressContainer.setAttribute("data-tags", tags.title + ' - ' + tags.artist)
        playButton.setAttribute("data-album", tags.album + ' - ' + tags.year);
    }
})();