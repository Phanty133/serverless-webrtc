function broadcastMessage(msg, except) {
	for (const iframe of document.querySelectorAll("iframe")) {
		if (iframe.contentWindow === except) continue;

		iframe.contentWindow.postMessage(msg, "*");
	}
}

function main() {
	window.onmessage = (e) => {
		broadcastMessage(e.data, e.source);
	};
}

function init() {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", main);
	} else {
		main();
	}
}

init();
