import RTCConnection from "./RTCConnection";
import RTCNetwork, { RTCNetworkConnectionAttemptData } from "./RTCNetwork";

const netw = new RTCNetwork();

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
		
		return;
	}

	const msgData = JSON.parse(msg);
	const label = msgData.label as string;
	const target = msgData.target as string;
	const source = msgData.source as string;

	if (target !== id) return;

	const data = (msgData.data ?? null) as RTCNetworkConnectionAttemptData | null;

	if (data === null) {
		console.warn("Attempt to handle empty data!");
		return;
	}

	// Define response functions in case the session description is an offer, rather than an answer
	const sendSessionHandler = (session: RTCNetworkConnectionAttemptData) => { sendMessage(source, "session", session); };
	const sendCandidateHandler = (candidate: RTCNetworkConnectionAttemptData) => { sendMessage(source, "candidate", candidate); };

	netw.handleIncomingData(data, sendSessionHandler, sendCandidateHandler);
}

function connectTo(connectionID: string) {
	const sendSessionHandler = (session: RTCNetworkConnectionAttemptData) => { sendMessage(connectionID, "session", session); };
	const sendCandidateHandler = (candidate: RTCNetworkConnectionAttemptData) => { sendMessage(connectionID, "candidate", candidate); };

	netw.addForeignPeer(
		sendSessionHandler,
		sendCandidateHandler,
	);
}

function main() {
	const params = new URLSearchParams(location.search);
	id = params.get("id")!;
}

function init() {
	window.addEventListener("message", (e) => {
		handleMessage(e.data);
	});

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", main);
	} else {
		main();
	}
}

init();