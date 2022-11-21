import RTCConnection from "./RTCConnection";
import RTCNetwork from "./RTCNetwork";

const connections: Record<string, RTCConnection> = {};
const channels: RTCDataChannel[] = [];

let id = "";

function sendMessage(target:string, label: string, data: any) {
	window.top!.postMessage(JSON.stringify({
		source: id,
		target,
		label,
		data
	}), "*");
}

function handleMessage(msg: string) {
	if (msg.startsWith("connect")) {
		connectTo(msg.split("-")[1]);
		return;
	} else if (msg === "send") {
		for (const ch of channels) {
			ch.send(`Hello world from ${id}!`);
		}
		return;
	}

	const msgData = JSON.parse(msg);
	const label = msgData.label as string;
	const target = msgData.target as string;
	const source = msgData.source as string;

	if (target !== id) return;

	const data = msgData.data as Record<string, any>;

	if (!(source in connections)) {
		connections[source] = createConnection(source);
	}

	switch (label) {
		case "session":
			connections[source].handleSessionDesc(data as RTCSessionDescription);
			break;
		case "candidate":
			connections[source].addIceCandidate(data as RTCIceCandidate);
			break;
	}
}

function addChannelListeners(ch: RTCDataChannel) {
	ch.addEventListener("open", () => {
		console.log(`channel open (${id}, ${ch.label})`);
	});

	ch.addEventListener("message", (msgEv) => {
		console.log(`msg received: ${msgEv.data}`);
	});
}

function createConnection(connectionID: string) {
	const con = new RTCConnection({
		sendSessionCb: (session: RTCSessionDescription) => { sendMessage(connectionID, "session", session); },
		sendCandidateCb: (candidate: RTCIceCandidate) => { sendMessage(connectionID, "candidate", candidate); },
	});

	con.con.addEventListener("datachannel", (e) => {
		const ch = e.channel;
		channels.push(ch);

		console.log(`new data channel (${id}, ${ch.label})`);

		addChannelListeners(ch);
	});

	return con;
}

function connectTo(connectionID: string) {
	if (connectionID in connections) {
		console.warn(`Already conneceted to ${connectionID}! (${id})`);
		return;
	}

	const con = createConnection(connectionID);
	connections[connectionID] = con;

	const ch = con.con.createDataChannel("test");

	addChannelListeners(ch);
	channels.push(ch);
}

function main() {
	const params = new URLSearchParams(location.search);
	id = params.get("id")!;
}

function init() {
	window.onmessage = (e) => {
		handleMessage(e.data);
	};

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", main);
	} else {
		main();
	}
}

init();