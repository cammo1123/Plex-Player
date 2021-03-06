const { ipcRenderer } = require("electron");
const observer = loader();

observer.observe();

let curDur;
let allAlbums;
let offset = 0;
let prevTime = 0;
let playerUpdate;
let curTrackInfo = {};
let Queue = [];
let Played = [];

async function getAlbums() {
	return await ipcRenderer.invoke("getAlbums");
}

async function getTracks(key) {
	return await ipcRenderer.invoke("getTracks", key);
}

async function onload() {
	gotoAlbums();
	$(".player").hide();
	document.getElementById("playerController").addEventListener("play", function () {
		document.getElementById("playerController").addEventListener("ended", nextTrack);
	});

	document.getElementById("songProgress").addEventListener("mousedown", seek);
	document.getElementById("songProgress").addEventListener("mouseup", applySeek);
	allAlbums = await getAlbums();

	var allImages = "";

	for (let i = 0; i < allAlbums.length; i = i + 1) {
		allImages += '<div class="column"><div class="cover" onclick="albumPage(this, ' + allAlbums[i].key + ');"><img class="loader" loading="lazy" src="' + allAlbums[i].cover + '" onerror="this.onerror=null; this.src=\'track.svg\'"></div><div class="info"><h2>' + allAlbums[i].title + "</h2><p>" + allAlbums[i].artist + "</p></div></div>";
	}

	document.getElementById("gsearch").addEventListener("input", (event) => {
		let value = event.target.value;
		if (value == "") {
			$("#searchGrid").hide();
			$("#grid").show();
		} else {
			search(value);
		}
	});

	$("#grid").append(allImages);
}

function createChild(parent, tag, className) {
	const elem = document.createElement(tag);
	if (className) elem.className = className;
	parent.appendChild(elem);
	return elem;
}

async function playTrack(key, duration, title, artist, o = 0, albumKey = false, index = false) {
	currentTrackInfo = {
		title: title,
		artist: artist,
		duration: duration,
		key: key,
	};

	$(".player").show();

	console.clear();
	console.log(index);

	if (albumKey != false) {
		Queue = [];
		const data = await getTracks(albumKey);
		for (let i = index; i < data.tracks.length; i++) {
			console.log(data.tracks[i].title);
			Queue.push(data.tracks[i]);
		}
		if (index > 0) {
			for (let i = 0; i < index; i++) {
				console.log(data.tracks[i].title);
				Queue.push(data.tracks[i]);
			}
		}
		Queue.splice(0, 1);
	}
	offset = o;

	const playerController = document.getElementById("playerController");

	const player = document.getElementById("player");
	playerController.currentTime = 0;

	player.src = "https://192.168.1.2:32400/video/:/transcode/universal/start.m3u8?maxVideoBitrate=128&X-Plex-Platform=Chrome&copyts=1&offset=" + offset + "&path=http%3A%2F%2F192.168.1.2%3A32400%2Flibrary%2Fmetadata%2F" + key + "&mediaIndex=0&videoResolution=1280x720&X-Plex-Token=VQtcZgf2mLWgydAs-uRH";
	playerController.load();
	playerController.play();

	playerUpdate = setInterval(checkSongTime, 1000);

	curDur = duration / 1000;

	document.getElementById("endTime").innerHTML = timeConverter(curDur);
	document.getElementById("songTitle").innerHTML = `<h2>` + title + `</h2><p>` + artist + `</p>`;

	checkSongTime();
}

function search(term) {
	const options = {
		includeScore: true,
		keys: [
			{ name: "title", weight: 0.5 },
			{ name: "artist", weight: 0.5 },
		],
	};

	const fuse = new Fuse(allAlbums, options);

	const result = fuse.search(term);

	var allImages = "";
	let foundAlbums = [];

	for (const album in result) {
		if (result[album]["score"] < 0.5) {
			foundAlbums.push(result[album]["item"]);
		}
	}

	for (let i = 0; i < foundAlbums.length; i = i + 1) {
		allImages += '<div class="column"><div class="cover" onclick="albumPage(this, ' + foundAlbums[i].key + ');"><img class="loader" loading="lazy" src="' + foundAlbums[i].cover + '" onerror="this.onerror=null; this.src=\'track.svg\'"></div><div class="info"><h2>' + foundAlbums[i].title + "</h2><p>" + foundAlbums[i].artist + "</p></div></div>";
	}

	$("#searchGrid").html(allImages);
	$("#searchGrid").show();
	$("#grid").hide();
	return foundAlbums;
}

function applySeek() {
	offset = parseFloat(document.getElementById("songProgress").value);
	playTrack(currentTrackInfo.key, currentTrackInfo.duration, currentTrackInfo.title, currentTrackInfo.artist, offset);
}

function seek() {
	console.log("dd");
	document.getElementById("playerController").removeEventListener("ended", nextTrack);
	clearInterval(playerUpdate);
}

function checkSongTime() {
	const playerController = document.getElementById("playerController");

	const player = document.getElementById("player");

	document.getElementById("songProgress").value = playerController.currentTime + offset;
	document.getElementById("songProgress").max = curDur;

	document.getElementById("curTime").innerHTML = timeConverter(playerController.currentTime + offset);
}

function timeConverter(UNIX_timestamp) {
	var a = new Date(UNIX_timestamp * 1000);
	var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	var year = a.getFullYear();
	var month = months[a.getMonth()];
	var date = a.getDate();
	var hour = a.getHours();
	var min = a.getMinutes();
	var sec = a.getSeconds();
	if (sec < 10) {
		sec = "0" + sec;
	}
	var time = min + ":" + sec;
	return time;
}
function shuffle(a) {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

async function albumPage(ele, key) {
	// const data = await gotoAlbum(key);

	document.getElementById("albumView").style.display = "block";
	document.getElementById("albumsView").style.display = "none";

	const data = await getTracks(key);
	let songData = data.tracks;

	let allImages = "";

	console.log(data);

	let info = "";

	for (let i = 0; i < songData.length; i = i + 1) {
		const time = timeConverter(songData[i].duration / 1000);

		allImages +=
			`<div class="listRow" onclick="playTrack(` +
			songData[i].key +
			`, ` +
			songData[i].duration +
			`,'` +
			songData[i].title.split("'").join("\\'") +
			`', '` +
			songData[i].artist.split("'").join("\\'") +
			`', 0,'` +
			data.info.key +
			`', '` +
			i +
			`')">
				<div class="trackNum"><span>` +
			songData[i].number +
			`</span></div>
				<div class="trackName"><span>` +
			songData[i].title +
			`</span></div>
				<div class="trackDur"><span>` +
			time +
			`</span></div>
			</div>`;
	}

	$(".albumButtons").html(`<button class="listRow" onclick="playTrack(` + songData[0].key + `, ` + songData[0].duration + `,'` + songData[0].title.split("'").join("\\'") + `', '` + songData[0].artist.split("'").join("\\'") + `', 0,'` + data.info.key + `', '` + 0 + `')">Play</button>`);
	$(".albumImage").attr("src", data.info.src);
	$(".albumTitle").html(data.info.title);
	$(".albumArtist").html(data.info.artist);

	if (data.info.description == undefined) {
		data.info.description = "";
	}

	$(".albumDescription").html(data.info.description);

	// $(".trackList").set();
	$(".trackList").html(allImages);
}

function gotoAlbums() {
	document.getElementById("albumView").style.display = "none";
	document.getElementById("albumsView").style.display = "block";
}

//? Queue Functionality

function queueAlbum(key) {}

function nextTrack() {
	playTrack(Queue[0].key, Queue[0].duration, Queue[0].title, Queue[0].artist);

	Played.push(Queue[0]);
	Queue.splice(0, 1);
}

function playPause() {
	const playerController = document.getElementById("playerController");
	if (playerController.paused) {
		playerController.play();
	} else if (!playerController.paused) {
		playerController.pause();
	}
}

function prevTrack() {
	let last = Played.length - 1;

	playTrack(Played[last].key, Played[last].duration, Played[last].title, Played[last].artist);

	Queue.unshift(Played[last]);
	Played.splice(last, 1);
}

function shuffleAlbum(key) {}
