import indexHtml from "./index.html";

Bun.serve({
  routes: {
    "/": indexHtml,
  },
  fetch: async (req) => {
    const url = new URL(req.url);
    if (url.pathname === "/x.eml") {
      const file = await Bun.file("./x.eml").text();
      return new Response(file, {
        headers: { "content-type": "message/rfc822; charset=utf-8" },
      });
    }
    return new Response("Not Found", { status: 404 });
  },
  development: {
    hmr: false,
    console: true,
  },
});
