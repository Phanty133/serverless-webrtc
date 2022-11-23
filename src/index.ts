import RTCConnection from "./RTCConnection";
import RTCNetwork from "./RTCNetwork";

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

	const data = msgData.data as Record<string, any> | null;

	switch (label) {
		case "session":
			{
				// Define response functions in case the session description is an offer, rather than an answer
				const sendSessionHandler = (session: RTCSessionDescriptionInit) => { sendMessage(source, "session", session); };
				const sendCandidateHandler = (candidate: RTCIceCandidateInit) => { sendMessage(source, "candidate", candidate); };

				netw.handleSessionDesc(data as RTCSessionDescription, sendSessionHandler, sendCandidateHandler);
			}
			break;
		case "candidate":
			netw.handleICECandidate(data as RTCIceCandidateInit);
			break;
	}
}

function connectTo(connectionID: string) {
	const sendSessionHandler = (session: RTCSessionDescriptionInit) => { sendMessage(connectionID, "session", session); };
	const sendCandidateHandler = (candidate: RTCIceCandidateInit) => { sendMessage(connectionID, "candidate", candidate); };

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