import { ValueOf } from "../../utils/ObjectUtils";
import { ManagementMessageType } from "../management/RTCManagementChannel";
import RTCNetwork from "../network/RTCNetwork";
import RTCNetworkNode from "../node/RTCNetworkNode";
import RTCDecision, { DecisionKey } from "./decision/RTCDecision";
import RTCDecisionAction, { RTCDecisionActionData } from "./decision/RTCDecisionAction";
import RTCDecisionAttempt, { DecisionID, RTCDecisionAttemptData } from "./decision/RTCDecisionAttempt";
import RTCDecisionResponse, { RTCDecisionResponseData } from "./decision/RTCDecisionResponse";
import RTCDecisionQueue from "./queue/RTCDecisionQueue";

export type RTCDecisionList = { [K in DecisionKey]: any };
type MapDecisionKey<TDecisionList> = Extract<keyof TDecisionList, DecisionKey>;

interface LocalDecisionAttempt {
	expectedResponses: number
	responses: RTCDecisionResponseData[]
	attempt: RTCDecisionAttempt<any>
}

export default class RTCDecisionManager<TDecisionList extends RTCDecisionList> {
	readonly netw: RTCNetwork;

	readonly decisionQueue: RTCDecisionQueue;

	readonly decisions: Map<MapDecisionKey<TDecisionList>, RTCDecision<ValueOf<TDecisionList>>>;

	readonly activeDecisionAttempts: Map<DecisionID, LocalDecisionAttempt>;

	readonly targetConsensus: number;

	constructor(netw: RTCNetwork, targetConsensus = 2 / 3) {
		this.netw = netw;
		this.targetConsensus = targetConsensus;

		this.decisions = new Map();
		this.activeDecisionAttempts = new Map();
		this.decisionQueue = new RTCDecisionQueue();
		this.bindListeners();
	}

	private bindListeners(): void {
		for (const node of this.netw.nodes) {
			this.bindNodeListeners(node);
		}

		this.netw.addEventListener("peer", (ev) => {
			const node = this.netw.getNodeById(ev.detail);

			if (node === null) {
				console.warn(`Invalid peer ID (${ev.detail})`);
				return;
			}

			this.bindNodeListeners(node);
		});

		this.decisionQueue.addEventListener("queue", (ev) => {
			void this.onNextAttempt(ev.detail);
		});
	}

	private bindNodeListeners(node: RTCNetworkNode): void {
		node.management.addEventListener("message", (ev) => {
			switch (ev.detail.type) {
				case ManagementMessageType.DECISION_ATTEMPT:
					this.handleDecisionAttempt(ev.detail.payload);
					break;
				case ManagementMessageType.DECISION_RESPONSE:
					void this.handleDecisionResponse(ev.detail.payload);
					break;
				case ManagementMessageType.DECISION_ACTION:
					void this.handleDecisionAction(ev.detail.payload);
					break;
			}
		});
	}

	private handleDecisionAttempt(data: RTCDecisionAttemptData<any>): void {
		this.decisionQueue.queueAttempt(RTCDecisionAttempt.import(data));
	}

	private async handleDecisionResponse(data: RTCDecisionResponseData): Promise<void> {
		const activeAttempt = this.activeDecisionAttempts.get(data.id);

		if (activeAttempt === undefined) {
			console.warn(`Attempt to get active decision attempt with invalid ID (${data.id})`);
			return;
		}

		const { responses: responseData, expectedResponses, attempt } = activeAttempt;

		responseData.push(data);

		if (responseData.length !== expectedResponses) return;

		const responses = responseData.map((r) => RTCDecisionResponse.import(r));
		const decision = this.decisions.get(data.key as MapDecisionKey<TDecisionList>);

		if (decision === undefined) {
			console.warn(`Invalid decision key when handling decision responses (${data.key})`);
			return;
		}

		const consensus = responses.filter((r) => r.response).length / expectedResponses;
		this.activeDecisionAttempts.delete(data.id);

		if (consensus < this.targetConsensus) {
			// ruh roh invalid action
			await decision.opts.declineHandler(data.id);
			return;
		}

		const action = new RTCDecisionAction(attempt, responses);
		this.netw.broadcastManagement(ManagementMessageType.DECISION_ACTION, action.export());

		void decision.localExec(attempt.data);
	}

	private async handleDecisionAction(data: RTCDecisionActionData<any>): Promise<void> {
		const action = RTCDecisionAction.import(data);

		if (!(await action.isValid(this))) {
			console.warn(`Action invalid! Possible sussiness? (Node: ${data.sourceNode})`);
			return;
		}

		const decision = this.decisions.get(action.key as MapDecisionKey<TDecisionList>);

		if (decision === undefined) {
			console.warn(`Invalid decision key when handling action! (${data.key})`);
			return;
		}

		void decision.foreignExec(action.attempt.data, action.sourceNode);
	}

	private async onNextAttempt(attempt: RTCDecisionAttempt<any>): Promise<void> {
		const decision = this.decisions.get(attempt.key as MapDecisionKey<TDecisionList>);

		if (decision === undefined) {
			console.warn(`Invalid decision attempt key (${attempt.key})`);
			console.log(this.netw.local.id);
			console.log(attempt);
			return;
		}

		const response = await decision.validateAttempt(attempt);
		const sourceNode = this.netw.getNodeById(attempt.sourceNode);

		if (sourceNode === null) {
			console.warn(`Invalid node ID ${attempt.sourceNode}`);
			return;
		}

		const nullResponseData: RTCDecisionResponseData = {
			sourceNode: this.netw.local.id,
			id: attempt.id,
			key: attempt.key,
			response: false,
			signature: null
		};

		sourceNode.management.send<RTCDecisionResponseData>({
			type: ManagementMessageType.DECISION_RESPONSE,
			source: this.netw.local.id,
			relayVia: null,
			target: sourceNode.id,
			payload: response === null ? nullResponseData : response.export()
		});
	}

	registerDecision<K extends MapDecisionKey<TDecisionList>>(decision: RTCDecision<TDecisionList[K]>): void {
		// First casting to unknown because TypeScript is being weird with K not matching keyof TDecisionList
		this.decisions.set(decision.opts.key as K, decision as unknown as RTCDecision<ValueOf<TDecisionList>>);
	}

	async attempt<K extends MapDecisionKey<TDecisionList>>(key: K, data: TDecisionList[K]): Promise<DecisionID | null> {
		const checkDecision = this.decisions.get(key);

		if (checkDecision === undefined) {
			console.warn(`Attempt to attempt decision with invalid key! (${String(key)})`);
			return null;
		}

		// First casting to unknown because TypeScript is being weird with K not matching keyof TDecisionList
		const decision = checkDecision as unknown as RTCDecision<TDecisionList[K]>;
		const attempt = decision.generateAttempt(key, data);
		const attemptData = attempt.export();

		this.activeDecisionAttempts.set(attempt.id, {
			expectedResponses: this.netw.nodes.length,
			responses: [],
			attempt
		});

		this.netw.broadcastManagement(ManagementMessageType.DECISION_ATTEMPT, attemptData);
		// this.handleDecisionAttempt(attemptData); // Also queue the attempt locally

		return attemptData.id;
	}
}
