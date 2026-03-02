const USERNAME = "IAM";
const PASSWORD = "HAMER@6362";

function unauthorized() {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="Secure Area"` }
  });
}

export default {
  async fetch(request) {
    // Authorization check
    const auth = request.headers.get("Authorization");
    if (!auth || !auth.startsWith("Basic ")) return unauthorized();

    const encoded = auth.split(" ")[1];
    const decoded = atob(encoded);
    const [user, pass] = decoded.split(":");

    if (user !== USERNAME || pass !== PASSWORD) {
      return unauthorized();
    }

    return new Response("Worker API Running (Authenticated)", {
      headers: { "content-type": "text/plain" }
    });
  }
};
