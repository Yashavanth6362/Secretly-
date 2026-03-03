// ===========================
// CORS
// ===========================
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };
}

function preflight() {
  return new Response(null, { status: 204, headers: cors() });
}

// ===========================
// BASIC AUTH (Website Search Only)
// ===========================
const USERNAME = "IAM";
const PASSWORD = "HAMER@6362";

function unauthorized() {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": "Basic", ...cors() }
  });
}

function checkAuth(request) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Basic ")) return false;
  const [u, p] = atob(auth.split(" ")[1]).split(":");
  return u === USERNAME && p === PASSWORD;
}

// ===========================
// GOOGLE SHEET CONFIG
// ===========================
const SHEET_ID = "1OAXNqWCnRYZsE6IDaRHSb9RKmhxwC3k3rRr_D5DHsH0";
const API_KEY = "AIzaSyA8O56APKbTlz24SeLCmcB3falK13sn34I";

const READ_URL =
  `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Data?key=${API_KEY}`;

const WRITE_URL =
  `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Data!A:L:append?valueInputOption=USER_ENTERED&key=${API_KEY}`;

// ===========================
// TELEGRAM CONFIG
// ===========================
const BOT_TOKEN = "7087197327:AAEQowshPIbjdi_uD2zObIKOHRHFca7AuEw";

// send a reply back to Telegram
async function botReply(chat_id, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body = { chat_id, text, parse_mode: "HTML" };

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function getFilePath(file_id) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${file_id}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.ok) return null;
  return data.result.file_path;
}

// ===========================
// PARSER — Method 2 (field labels)
// ===========================
function parseFields(caption) {
  const fields = {
    name: "",
    aadhar: "",
    phone: "",
    pan: "",
    dob: "",
    address: "",
    info: "",
    education: "",
    family: ""
  };

  caption.split("\n").forEach(line => {
    const [key, ...valueParts] = line.split(":");
    if (!key || !valueParts.length) return;
    const value = valueParts.join(":").trim();
    const lower = key.toLowerCase();

    if (lower.startsWith("name")) fields.name = value;
    else if (lower.startsWith("aadhar")) fields.aadhar = value;
    else if (lower.startsWith("phone")) fields.phone = value;
    else if (lower.startsWith("pan")) fields.pan = value;
    else if (lower.startsWith("dob")) fields.dob = value;
    else if (lower.startsWith("address")) fields.address = value;
    else if (lower.startsWith("info")) fields.info = value;
    else if (lower.startsWith("education")) fields.education = value;
    else if (lower.startsWith("family")) fields.family = value;
  });

  return fields;
}

// tick-mark verification message
function verifyFields(f) {
  return `
Name: ${f.name ? "✔️" : "❌"} ${f.name}
Aadhar: ${f.aadhar ? "✔️" : "❌"} ${f.aadhar}
Phone: ${f.phone ? "✔️" : "❌"} ${f.phone}
PAN: ${f.pan ? "✔️" : "❌"} ${f.pan}
DOB: ${f.dob ? "✔️" : "❌"} ${f.dob}
Address: ${f.address ? "✔️" : "❌"} ${f.address}
Info: ${f.info ? "✔️" : "❌"} ${f.info}
Education: ${f.education ? "✔️" : "❌"} ${f.education}
Family: ${f.family ? "✔️" : "❌"} ${f.family}
`;
}

// ===========================
// SAVE ROW INTO GOOGLE SHEET
// ===========================
async function saveRow(d) {
  const imageFormula =
    `=IMAGE("https://api.telegram.org/file/bot${BOT_TOKEN}/${d.file_path}")`;

  const row = [
    d.name, d.aadhar, d.phone, d.pan, d.dob,
    d.address, d.info, d.education, d.family,
    d.file_id, imageFormula,
    new Date().toISOString()
  ];

  return fetch(WRITE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: [row] })
  });
}

// ===========================
// SEARCH FUNCTION (Website)
// ===========================
async function search(q) {
  const res = await fetch(READ_URL);
  const data = await res.json();
  if (!data.values) return null;

  for (let i = 1; i < data.values.length; i++) {
    const r = data.values[i];

    if (
      (q.name && r[0]?.toLowerCase() === q.name.toLowerCase()) ||
      (q.aadhar && r[1] === q.aadhar) ||
      (q.phone && r[2] === q.phone)
    ) {
      return {
        name: r[0], aadhar: r[1], phone: r[2], pan: r[3], dob: r[4],
        address: r[5], info: r[6], education: r[7], family: r[8],
        file_id: r[9], embed_link: r[10],
        timestamp: r[11]
      };
    }
  }
  return null;
}

// ===========================
// MAIN WORKER
// ===========================
export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return preflight();

    const url = new URL(request.url);
    const path = url.pathname;

    // WEBSITE SEARCH
    if (path === "/search") {
      if (!checkAuth(request)) return unauthorized();

      const q = {
        name: url.searchParams.get("name"),
        aadhar: url.searchParams.get("aadhar"),
        phone: url.searchParams.get("phone")
      };

      const out = await search(q);

      return new Response(JSON.stringify(out || {}), {
        headers: { "Content-Type": "application/json", ...cors() }
      });
    }

    // TELEGRAM HANDLING
    if (path === "/telegram" && request.method === "POST") {
      const update = await request.json();
      const msg = update.message;

      if (!msg) return new Response("ignored", { headers: cors() });

      // If user sends "hi"
      if (msg.text && msg.text.toLowerCase() === "hi") {
        await botReply(
          msg.chat.id,
`🟢 SEND DETAILS IN THIS FORMAT 👇

Name:
Aadhar:
Phone:
PAN:
DOB:
Address:
Info:
Education:
Family:

📸 Upload PHOTO + Paste this filled format`
        );
        return new Response("ok", { headers: cors() });
      }

      // Must include photo
      if (!msg.photo) {
        await botReply(msg.chat.id, 
"❌ No photo detected.\nSend a PHOTO + format.");
        return new Response("no photo", { headers: cors() });
      }

      const caption = msg.caption || "";
      const fields = parseFields(caption);

      // Required field validation
      if (!fields.name || !fields.aadhar || !fields.phone) {
        await botReply(
          msg.chat.id,
`⚠️ MISSING REQUIRED FIELDS

${verifyFields(fields)}

Required: Name, Aadhar, Phone`
        );
        return new Response("missing", { headers: cors() });
      }

      const file_id = msg.photo[msg.photo.length - 1].file_id;
      const file_path = await getFilePath(file_id);

      fields.file_id = file_id;
      fields.file_path = file_path;

      await saveRow(fields);

      await botReply(
        msg.chat.id,
`✅ <b>SAVED SUCCESSFULLY</b>

${verifyFields(fields)}

📌 Stored in database.`
      );

      return new Response("saved", { headers: cors() });
    }

    return new Response("Invalid", { headers: cors() });
  }
};