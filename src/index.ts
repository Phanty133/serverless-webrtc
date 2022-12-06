import RTCNetwork, { RTCConnectionPacket } from "./rtc/network/RTCNetwork";
import Messaging from "./messaging/Messaging";
import MessagingEvent from "./messaging/MessagingEvent";
import RTCDecisionManager, { RTCDecisionList } from "./rtc/decisions/RTCDecisionManager";
import RTCDecision from "./rtc/decisions/decision/RTCDecision";

interface DecisionData extends RTCDecisionList {
	"testdecision": { arg1: string, arg2: number }
}

const netw = new RTCNetwork({
	connection: {
		iceServers: [
			{
				urls: "stun:openrelay.metered.ca:80"
			}
		]
	}
});
let messaging: Messaging;
const messageQueue: MessagingEvent[] = [];

function msgHandler(ev: MessagingEvent): void {
	if (!netw.initialized) {
		messageQueue.push(ev);
		return;
	}

	const { source, data } = ev.detail;

	if (data === null) {
		console.warn("Attempt to handle empty data!");
		return;
	}

	if (source === "-1") {
		connectTo(data);
		return;
	}

	const msgTransport = (packet: RTCConnectionPacket): void => { messaging.send(source, JSON.stringify(packet)); };
	netw.handleIncomingPacket(JSON.parse(data), msgTransport);
}

function connectTo(connectionID: string): void {
	const msgTransport = (packet: RTCConnectionPacket): void => { messaging.send(connectionID, JSON.stringify(packet)); };
	netw.addForeignPeer(msgTransport);
}

async function main(): Promise<void> {
	const params = new URLSearchParams(location.search);
	messaging = new Messaging(params.get("id") ?? "");

	messaging.addEventListener("message", msgHandler as EventListener);

	console.log(`Iframe ${messaging.id}, ID: ${netw.local.id}`);

	netw.addEventListener("init", () => {
		for (const msg of messageQueue) {
			msgHandler(msg);
		}
	});

	const decisionManager = new RTCDecisionManager<DecisionData>(netw);
	const correctData = { arg1: "Hello", arg2: 69 };

	const acceptHandler = async(decisionData: DecisionData["testdecision"]): Promise<void> => {
		console.log(`Local decision accepted (Local: ${netw.local.id})`);
		console.log(decisionData);
	};

	const declineHandler = async(): Promise<void> => {
		console.log("DECISION DECLINED LOL");
	};

	const validityHandler = async(decisionData: DecisionData["testdecision"]): Promise<boolean> => {
		return decisionData.arg1 === correctData.arg1 && decisionData.arg2 === correctData.arg2;
	};

	const decisionHandler = async(decisionData: DecisionData["testdecision"], node: string): Promise<void> => {
		console.log(`Foreign decision accepted (Node: ${node}, Local: ${netw.local.id})`);
		console.log(decisionData);
	};

	decisionManager.registerDecision(new RTCDecision<DecisionData["testdecision"]>({
		key: "testdecision",
		netw,
		acceptHandler,
		declineHandler,
		validityHandler,
		decisionHandler
	}));

	if (messaging.id === "0") {
		setTimeout(() => {
			const data = { arg1: "Hello", arg2: 42 };

			console.log("-------------------------------");
			console.log("Decision attempt data:");
			console.log(data);
			console.log("Expecting:");
			console.log(correctData);
			console.log("-------------------------------");

			void decisionManager.attempt("testdecision", data);
		}, 3000);
	}
}

function init(): void {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", () => { void main(); });
	} else {
		void main();
	}
}

init();
