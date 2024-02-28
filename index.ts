Bun.serve({
	fetch(req) {
		return new Response("hell world");
	},
});
