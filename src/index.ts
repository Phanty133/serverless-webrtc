import RTCNetwork, { RTCConnectionPacket } from "./rtc/network/RTCNetwork";
import Messaging from "./messaging/Messaging";
import MessagingEvent from "./messaging/MessagingEvent";

const netw = new RTCNetwork({
	connection: {
		iceServers: [
			{
				urls: "stun:openrelay.metered.ca:80",
			},
		]
	}
});
let messaging: Messaging;

function msgHandler(ev: MessagingEvent) {
	const { source, data } = ev.detail;

	if (data === null) {
		console.warn("Attempt to handle empty data!");
		return;
	}

	if (source === "-1") {
		connectTo(data);
		return;
	}

	const msgTransport = (packet: RTCConnectionPacket) => { messaging.send(source, JSON.stringify(packet)); };
	netw.handleIncomingPacket(JSON.parse(data), msgTransport);
}

function connectTo(connectionID: string) {
	const msgTransport = (packet: RTCConnectionPacket) => { messaging.send(connectionID, JSON.stringify(packet)); };
	netw.addForeignPeer(msgTransport);
}

async function main() {
	const params = new URLSearchParams(location.search);
	messaging = new Messaging(params.get("id")!);

	messaging.addEventListener("message", msgHandler as EventListener);

	console.log(`Iframe ${messaging.id}, ID: ${netw.local.id}`);

	netw.local.addEventListener("ipfsinit", async (e) => {
		console.log(`IPFS ID: ${e.detail}`);

		await netw.local.ipfs!.swarm.connect((await netw.local.ipfs!.id()).id);
		await netw.local.subIPFSRTC();

		setTimeout(() => {
			if (messaging.id === "0") {
				netw.local.sendToIPFSRTC("Hello world!");
			}
		}, 3000);
	});
}

function init() {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", main);
	} else {
		main();
	}
}

init();