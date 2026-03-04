export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // ===== SECURITY =====
      const apiKey = request.headers.get("x-api-key");
      if (apiKey !== env.API_SECRET) {
        return json({ error: "Unauthorized" }, 401);
      }

      // ===== ROUTING =====
      if (path.startsWith("/api/user")) {
        return await userRoutes(request, env);
      }

      if (path.startsWith("/api/file")) {
        return await fileRoutes(request, env);
      }

      return json({ error: "Invalid route" }, 404);

    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
};

//////////////////////////
// USER ROUTES (KV)
//////////////////////////

async function userRoutes(request, env) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name");

  // CREATE
  if (request.method === "POST" && url.pathname.endsWith("/create")) {
    const data = await request.json();
    if (!data.name) return json({ error: "Name required" }, 400);

    await env.PERSON_DB.put(
      "user:" + data.name.toLowerCase(),
      JSON.stringify(data)
    );

    return json({ success: "User created" });
  }

  // GET
  if (request.method === "GET" && url.pathname.endsWith("/get")) {
    if (!name) return json({ error: "Name required" }, 400);

    const value = await env.PERSON_DB.get(
      "user:" + name.toLowerCase()
    );

    return json(value ? JSON.parse(value) : {});
  }

  // UPDATE
  if (request.method === "PUT" && url.pathname.endsWith("/update")) {
    if (!name) return json({ error: "Name required" }, 400);

    const data = await request.json();

    await env.PERSON_DB.put(
      "user:" + name.toLowerCase(),
      JSON.stringify(data)
    );

    return json({ success: "User updated" });
  }

  // DELETE
  if (request.method === "DELETE" && url.pathname.endsWith("/delete")) {
    if (!name) return json({ error: "Name required" }, 400);

    await env.PERSON_DB.delete(
      "user:" + name.toLowerCase()
    );

    return json({ success: "User deleted" });
  }

  // LIST
  if (request.method === "GET" && url.pathname.endsWith("/list")) {
    const list = await env.PERSON_DB.list();
    return json(list);
  }

  return json({ error: "User route not found" }, 404);
}

//////////////////////////
// FILE ROUTES (R2)
//////////////////////////

async function fileRoutes(request, env) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  // UPLOAD
  if (request.method === "POST" && url.pathname.endsWith("/upload")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!file) return json({ error: "File required" }, 400);

    const filename = Date.now() + "-" + file.name;

    await env.user_photos.put(filename, file.stream(), {
      httpMetadata: { contentType: file.type }
    });

    const publicURL = `https://pub-${env.user_photos}.r2.dev/${filename}`;

    return json({
      success: "File uploaded",
      key: filename,
      url: publicURL
    });
  }

  // DOWNLOAD
  if (request.method === "GET" && url.pathname.endsWith("/get")) {
    if (!key) return json({ error: "Key required" }, 400);

    const object = await env.user_photos.get(key);
    if (!object) return new Response("Not found", { status: 404 });

    return new Response(object.body, {
      headers: {
        "Content-Type":
          object.httpMetadata?.contentType || "application/octet-stream"
      }
    });
  }

  // DELETE
  if (request.method === "DELETE" && url.pathname.endsWith("/delete")) {
    if (!key) return json({ error: "Key required" }, 400);

    await env.user_photos.delete(key);
    return json({ success: "File deleted" });
  }

  // LIST
  if (request.method === "GET" && url.pathname.endsWith("/list")) {
    const list = await env.user_photos.list();
    return json(list);
  }

  return json({ error: "File route not found" }, 404);
}

//////////////////////////
// JSON HELPER
//////////////////////////

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}