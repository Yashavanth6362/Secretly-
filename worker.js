// ===============
// BASIC AUTH INFO
// ===============
const USERNAME = "IAM";
const PASSWORD = "HAMER@6362";

// ===============
// BASIC AUTH CHECK
// ===============
function unauthorized() {
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="Secure Area"`
    }
  });
}

export default {
  async fetch(request) {
    // Check Authorization header
    const auth = request.headers.get("Authorization");

    if (!auth || !auth.startsWith("Basic ")) {
      return unauthorized();
    }

    // Decode base64
    const encoded = auth.split(" ")[1];
    const decoded = atob(encoded); // "username:password"

    const [user, pass] = decoded.split(":");

    if (user !== USERNAME || pass !== PASSWORD) {
      return unauthorized();
    }

    // ============
    // AUTH SUCCESS
    // ============
    // Serve your static site from Cloudflare Pages or return HTML
    return new Response(`
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h2>Welcome, ${USERNAME}!</h2>
          <p>Your secured site is working.</p>
          <p>You can now add API calls, search page, database, etc.</p>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" }
    });
  }
};