const { ipcRenderer } = require("electron");
const electron = require("electron");
const observer = lozad();

observer.observe();

let curDur;
let offset = 0;
let prevTime = 0;
let playerUpdate;
let curTrackInfo = {};
let Queue = [];
let Played = [];

async function getAlbums(){
	return await ipcRenderer.invoke("getAlbums")
}

async function gotoAlbum(){
	return await ipcRenderer.invoke("gotoAlbum")
}

async function getTracks(key){
	return await ipcRenderer.invoke("getTracks", key)
}

async function onload() {
	gotoAlbums();
	$(".player").hide();
	document
		.getElementById("playerControler")
		.addEventListener("play", function () {
			document
				.getElementById("playerControler")
				.addEventListener("ended", nextTrack);
		});

	document.getElementById("songProgress").addEventListener("mousedown", seek);
	document
		.getElementById("songProgress")
		.addEventListener("mouseup", applySeek);
	const data = await getAlbums();

	var allImages = "";

	for (let i = 0; i < data.length; i = i + 1) {
		var width = 200;
		var height = 200;
		allImages +=
			'<div class="column"><div class="cover" onclick="albumPage(this, ' +
			data[i].key +
			');"><img class="lozad" loading="lazy" src="' +
			data[i].cover +
			'" onerror="this.onerror=null; this.src=\'track.svg\'"></div><div class="info"><h2>' +
			data[i].title +
			"</h2><p>" +
			data[i].artist +
			"</p></div></div>";
	}

	$("#grid").append(allImages);
}

function createChild(parent, tag, className) {
	const elem = document.createElement(tag);
	if (className) elem.className = className;
	parent.appendChild(elem);
	return elem;
}

async function playTrack(
	key,
	duration,
	title,
	artist,
	o = 0,
	albumKey = false,
	index = false
) {
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

	const playerControler = document.getElementById("playerControler");

	const player = document.getElementById("player");
	playerControler.currentTime = 0;

	player.src =
		"https://192.168.1.2:32400/video/:/transcode/universal/start.m3u8?maxVideoBitrate=128&X-Plex-Platform=Chrome&copyts=1&offset=" +
		offset +
		"&path=http%3A%2F%2F192.168.1.2%3A32400%2Flibrary%2Fmetadata%2F" +
		key +
		"&mediaIndex=0&videoResolution=1280x720&X-Plex-Token=VQtcZgf2mLWgydAs-uRH";
	playerControler.load();
	playerControler.play();

	playerUpdate = setInterval(checkSongTime, 1000);

	curDur = duration / 1000;

	document.getElementById("endTime").innerHTML = timeConverter(curDur);
	document.getElementById("songTitle").innerHTML =
		`<h2>` + title + `</h2><p>` + artist + `</p>`;

	checkSongTime();
}

function applySeek() {
	offset = parseFloat(document.getElementById("songProgress").value);
	playTrack(
		currentTrackInfo.key,
		currentTrackInfo.duration,
		currentTrackInfo.title,
		currentTrackInfo.artist,
		offset
	);
}

function seek() {
	console.log("dd");
	document
		.getElementById("playerControler")
		.removeEventListener("ended", nextTrack);
	clearInterval(playerUpdate);
}

function checkSongTime() {
	const playerControler = document.getElementById("playerControler");

	const player = document.getElementById("player");

	document.getElementById("songProgress").value =
		playerControler.currentTime + offset;
	document.getElementById("songProgress").max = curDur;

	document.getElementById("curTime").innerHTML = timeConverter(
		playerControler.currentTime + offset
	);
}

function timeConverter(UNIX_timestamp) {
	var a = new Date(UNIX_timestamp * 1000);
	var months = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
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
			songData[i].title.replace("'", "\\'") +
			`', '` +
			songData[i].artist.replace("'", "\\'") +
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

	$(".albumButtons").html(
		`<button class="listRow" onclick="playTrack(` +
			songData[0].key +
			`, ` +
			songData[0].duration +
			`,'` +
			songData[0].title.replace("'", "\\'") +
			`', '` +
			songData[0].artist.replace("'", "\\'") +
			`', 0,'` +
			data.info.key +
			`', '` +
			0 +
			`')">Play</button>`
	);
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
	const playerControler = document.getElementById("playerControler");
	if (playerControler.paused) {
		playerControler.play();
	} else if (!playerControler.paused) {
		playerControler.pause();
	}
}

function prevTrack() {
	let last = Played.length - 1;

	playTrack(
		Played[last].key,
		Played[last].duration,
		Played[last].title,
		Played[last].artist
	);

	Queue.unshift(Played[last]);
	Played.splice(last, 1);
}

function shuffleAlbum(key) {}
