const PlexAPI = require("plex-api");
const path = require("path");
const { ipcMain, app, BrowserWindow } = require("electron");

app.commandLine.appendSwitch("ignore-certificate-errors", "true");

const hostname = "192.168.1.2";

const client = new PlexAPI({ hostname });

let curKey;

function createWindow() {
	// Launch the browser.
	const win = new BrowserWindow({
		width: 800,
		height: 648 + 24,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			enableRemoteModule: true,
			webSecurity: false,
		},
	});

	win.loadFile("../FrontEnd/index.html");
}

exposeFunction("getAlbums", getAlbums);
exposeFunction("gotoAlbum", gotoAlbum);
exposeFunction("getTracks", getTracks);

function exposeFunction(name, exposedFunction) {
	ipcMain.handle(name, async (event, ...args) => {
		const res = await exposedFunction(...args);
		return res;
	});
}

app.whenReady().then(() => {
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

async function getAllAlbums(index) {
	const query = await client.query("/library/sections/" + index + "/search?type=9");
	const response = query.MediaContainer;

	let val;

	return (val = await Promise.resolve(response));
}

async function getAlbums() {
	let info;
	let albums = [];
	await Promise.all([getAllAlbums(2).then((r) => (info = r))]);
	for (let i = 0; i < info.Metadata.length; i = i + 1) {
		let track = {};
		track.title = info.Metadata[i].title;
		track.artist = info.Metadata[i].parentTitle;
		track.cover = "http://" + hostname + ":32400" + info.Metadata[i].thumb;
		track.key = info.Metadata[i].ratingKey;
		albums.push(track);
	}
	return albums;
}

async function gotoAlbum(key) {
	curKey = key;
	//await app.load("album.html");
}

async function gotoAlbums() {
	curKey = null;
	//await app.load("index.html");
}

async function getAllTracks(key) {
	let uri = "/library/metadata/" + key + "/children";

	const query = await client.query(uri);
	const response = query.MediaContainer;

	return await Promise.resolve(response);
}

async function getTracks(key) {
	// const key = curKey;
	let info;
	let data = {};
	let album = [];

	await Promise.all([getAllTracks(key).then((r) => (info = r))]);
	for (let i = 0; i < info.Metadata.length; i = i + 1) {
		let song = {};
		song.title = info.Metadata[i].title;
		song.number = info.Metadata[i].index;
		song.duration = info.Metadata[i].duration;
		song.key = info.Metadata[i].ratingKey;
		song.artist = info.Metadata[i].grandparentTitle;
		album.push(song);
	}
	let albumInfo = {};
	albumInfo.title = info.title1;
	albumInfo.artist = info.title2;
	albumInfo.src = "http://" + hostname + ":32400" + info.thumb;
	albumInfo.description = info.summary;
	albumInfo.key = key;

	data.tracks = album;
	data.info = albumInfo;
	return data;
}
