export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS SUPPORT
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
        }
      });
    }

    // ================= UPLOAD PHOTO (R2) =================
    if (path === "/uploadPhoto" && request.method === "POST") {
      const form = await request.formData();
      const file = form.get("photo");

      if (!file) {
        return new Response(JSON.stringify({ error: "No file uploaded" }), {
          headers: { "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*" }
        });
      }

      const filename = `${Date.now()}-${file.name}`;

      // *** THIS IS THE MOST IMPORTANT FIX ***
      await env.user_photos.put(filename, file.stream(), {
        httpMetadata: { contentType: file.type }
      });

      const publicURL = `https://pub-${env.user_photos.id}.r2.dev/${filename}`;

      return new Response(JSON.stringify({ photo_url: publicURL }), {
        headers: { "Content-Type": "application/json",
                   "Access-Control-Allow-Origin": "*" }
      });
    }

    // ================= SAVE USER (KV) =================
    if (path === "/save" && request.method === "POST") {
      const data = await request.json();
      const key = "user:" + data.name.toLowerCase();

      data.timestamp = Date.now();

      await env.PERSON_DB.put(key, JSON.stringify(data));

      return new Response(JSON.stringify({ status: "saved" }), {
        headers: { "Content-Type": "application/json",
                   "Access-Control-Allow-Origin": "*" }
      });
    }

    // ================= GET USER (KV) =================
    if (path === "/get") {
      const name = url.searchParams.get("name");

      if (!name) {
        return new Response("{}", {
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }

      const data = await env.PERSON_DB.get("user:" + name.toLowerCase());

      return new Response(data || "{}", {
        headers: { "Content-Type": "application/json",
                   "Access-Control-Allow-Origin": "*" }
      });
    }

    // Invalid route fallback
    return new Response("Invalid", {
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }
};