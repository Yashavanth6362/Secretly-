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

    // UPLOAD PHOTO TO R2
    if (path === "/uploadPhoto" && request.method === "POST") {
      const form = await request.formData();
      const file = form.get("photo");

      if (!file) {
        return new Response(JSON.stringify({ error: "No file uploaded" }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      const filename = `${Date.now()}-${file.name}`;

      await env.user_photos.put(filename, file.stream(), {
        httpMetadata: { contentType: file.type }
      });

      const publicURL = `https://pub-${env.user_photos}.r2.dev/${filename}`;

      return new Response(JSON.stringify({ photo_url: publicURL }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // SAVE USER DATA
    if (path === "/save" && request.method === "POST") {
      const data = await request.json();
      const key = "user:" + data.name.toLowerCase();
      data.timestamp = Date.now();

      await env.PERSON_DB.put(key, JSON.stringify(data));

      return new Response(JSON.stringify({ status: "saved" }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // GET USER DATA
    if (path === "/get") {
      const name = url.searchParams.get("name");

      if (!name) {
        return new Response("{}", {
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }

      const record =
        await env.PERSON_DB.get("user:" + name.toLowerCase());

      return new Response(record || "{}", {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // DEFAULT RESPONSE
    return new Response("Invalid path", {
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }
};