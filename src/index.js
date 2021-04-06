const PlexAPI = require("plex-api");
const path = require("path");
const { ipcMain, app, BrowserWindow } = require("electron");

app.commandLine.appendSwitch("ignore-certificate-errors", "true");

const hostname = "192.168.1.2";

const client = new PlexAPI({ hostname });

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
	const query = await client.query(`/library/sections/${index}/search?type=9`);

	return await Promise.resolve(query.MediaContainer);
}

async function getAlbums() {
	let info;
	let albums = [];
	await Promise.all([getAllAlbums(2).then((r) => (info = r))]);
	for (let i = 0; i < info.Metadata.length; i += 1) {
		albums.push({
			title: info.Metadata[i].title,
			artist: info.Metadata[i].parentTitle,
			cover: `http://${hostname}:32400${info.Metadata[i].thumb}`,
			key: info.Metadata[i].ratingKey,
		});
	}
	return albums;
}

async function getAllTracks(key) {
	const query = await client.query(`/library/metadata/${key}/children`);
	return await Promise.resolve(query.MediaContainer);
}

async function getTracks(key) {
	let info;
	let album = [];

	await Promise.all([getAllTracks(key).then((r) => (info = r))]);
	for (let i = 0; i < info.Metadata.length; i = i + 1) {
		album.push({
			title: info.Metadata[i].title,
			number: info.Metadata[i].index,
			duration: info.Metadata[i].duration,
			key: info.Metadata[i].ratingKey,
			artist: info.Metadata[i].grandparentTitle,
		});
	}

	return {
		tracks: album,
		info: {
			title: info.title1,
			artist: info.title2,
			src: `http://${hostname}:32400${info.thumb}`,
			description: info.summary,
			key: key,
		},
	};
}
