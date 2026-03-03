// =====================================
// BASIC AUTH (Website + API)
// =====================================
const USERNAME = "IAM";
const PASSWORD = "HAMER@6362";

function unauthorized() {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": "Basic realm=\"Secure Area\"" }
  });
}

function checkAuth(request) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Basic ")) return false;
  const [user, pass] = atob(auth.split(" ")[1]).split(":");
  return user === USERNAME && pass === PASSWORD;
}

// =====================================
// GOOGLE SHEET SETTINGS
// =====================================
const SHEET_ID = "1OAXNqWCnRYZsE6IDaRHSb9RKmhxwC3k3rRr_D5DHsH0";
const API_KEY = "AIzaSyA8O56APKbTlz24SeLCmcB3falK13sn34I";

const READ_URL =
  `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Data?key=${API_KEY}`;

const WRITE_URL =
  `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Data!A:L:append?valueInputOption=RAW&key=${API_KEY}`;

const UPDATE_URL =
  `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate?key=${API_KEY}`;

// =====================================
// WRITE TO SHEET
// =====================================
async function saveToSheet(d) {
  const row = [
    d.name, d.file_id, d.aadhar, d.phone, d.pan, d.dob,
    d.address, d.info, d.education, d.family,
    d.file_path, new Date().toISOString()
  ];

  return await fetch(WRITE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: [row] })
  });
}

// =====================================
// READ + SEARCH
// =====================================
async function searchSheet(q) {
  const res = await fetch(READ_URL);
  const data = await res.json();
  if (!data.values) return null;

  for (let i = 1; i < data.values.length; i++) {
    const r = data.values[i];
    const record = {
      row: i + 1,
      name: r[0], file_id: r[1], aadhar: r[2], phone: r[3], pan: r[4],
      dob: r[5], address: r[6], info: r[7], education: r[8],
      family: r[9], file_path: r[10], timestamp: r[11]
    };

    if (
      (q.name && r[0]?.toLowerCase() === q.name.toLowerCase()) ||
      (q.aadhar && r[2] === q.aadhar) ||
      (q.phone && r[3] === q.phone)
    ) {
      return record;
    }
  }
  return null;
}

// =====================================
// UPDATE RECORD
// =====================================
async function updateSheet(rowNumber, updates) {
  const columns = [
    "name","file_id","aadhar","phone","pan",
    "dob","address","info","education","family","file_path"
  ];

  const requests = [];

  for (const key in updates) {
    const colIndex = columns.indexOf(key);
    if (colIndex === -1) continue;

    requests.push({
      updateCells: {
        rows: [{
          values: [{
            userEnteredValue: { stringValue: updates[key] }
          }]
        }],
        fields: "userEnteredValue",
        range: {
          sheetId: 0,
          startRowIndex: rowNumber - 1,
          endRowIndex: rowNumber,
          startColumnIndex: colIndex,
          endColumnIndex: colIndex + 1
        }
      }
    });
  }

  return await fetch(UPDATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests })
  });
}

// =====================================
// TELEGRAM PHOTO HANDLING
// =====================================
const BOT_TOKEN = "7087197327:AAEQowshPIbjdi_uD2zObIKOHRHFca7AuEw";

async function getTelegramFilePath(file_id) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${file_id}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.ok) return null;
  return data.result.file_path;
}

// =====================================
// MAIN API ROUTES
// =====================================
export default {
  async fetch(request) {
    if (!checkAuth(request)) return unauthorized();

    const url = new URL(request.url);
    const path = url.pathname;

    // TEST
    if (path === "/test") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // SEARCH
    if (path === "/search") {
      const name = url.searchParams.get("name");
      const aadhar = url.searchParams.get("aadhar");
      const phone = url.searchParams.get("phone");

      const result = await searchSheet({ name, aadhar, phone });
      return new Response(JSON.stringify(result || {}), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // SAVE
    if (path === "/save") {
      const body = await request.json();
      await saveToSheet(body);
      return new Response(JSON.stringify({ status: "saved" }));
    }

    // UPDATE
    if (path === "/update") {
      const body = await request.json();
      const found = await searchSheet({
        name: body.name,
        aadhar: body.aadhar,
        phone: body.phone
      });

      if (!found)
        return new Response(JSON.stringify({ error: "not found" }));

      await updateSheet(found.row, body.update);
      return new Response(JSON.stringify({ status: "updated" }));
    }

    // TELEGRAM AUTO SAVE
    if (path === "/telegram") {
      const update = await request.json();
      const msg = update.message;

      if (!msg)
        return new Response(JSON.stringify({ error: "no message" }));

      const name = msg.caption || msg.text || "Unknown";

      if (!msg.photo)
        return new Response(JSON.stringify({ error: "no photo" }));

      const file_id =
        msg.photo[msg.photo.length - 1].file_id;

      const file_path = await getTelegramFilePath(file_id);

      await saveToSheet({
        name,
        file_id,
        aadhar: "",
        phone: "",
        pan: "",
        dob: "",
        address: "",
        info: "",
        education: "",
        family: "",
        file_path
      });

      return new Response(JSON.stringify({ status: "telegram_saved" }));
    }

    return new Response(JSON.stringify({ error: "invalid" }));
  }
};