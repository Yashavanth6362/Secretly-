export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS
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

    // =============== UPLOAD PHOTO ===============
    if (path === "/uploadPhoto" && request.method === "POST") {
      const form = await request.formData();
      const file = form.get("photo");

      if (!file) {
        return new Response(JSON.stringify({ error: "No file" }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // Create random filename
      const filename = `${Date.now()}-${file.name}`;

      // Upload to R2
      await env.R2BUCKET.put(filename, file.stream(), {
        httpMetadata: { contentType: file.type }
      });

      // Public URL
      const photo_url = `https://pub-${env.R2BUCKET.id}.r2.dev/${filename}`;

      return new Response(JSON.stringify({ photo_url }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // =============== SAVE USER DETAILS ===============
    if (path === "/save" && request.method === "POST") {
      const data = await request.json();
      const key = "user:" + data.name.toLowerCase();

      data.timestamp = Date.now();

      await env.PERSON_DB.put(key, JSON.stringify(data));

      return new Response(JSON.stringify({ status: "saved" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // =============== GET USER DETAILS ===============
    if (path === "/get") {
      const name = url.searchParams.get("name")?.toLowerCase();
      if (!name)
        return new Response("{}", {
          headers: { "Access-Control-Allow-Origin": "*" }
        });

      const json = await env.PERSON_DB.get("user:" + name);

      return new Response(json || "{}", {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    return new Response("Invalid", {
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }
};