// =====================================
// BASIC AUTH  (Website + API protected)
// =====================================
const USERNAME = "IAM";
const PASSWORD = "HAMER@6362";

function unauthorized() {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Secure Area"' }
  });
}

function checkAuth(request) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Basic ")) return false;

  const encoded = auth.split(" ")[1];
  const decoded = atob(encoded);
  const [user, pass] = decoded.split(":");
  return user === USERNAME && pass === PASSWORD;
}

// =====================================
// GOOGLE SHEET SETTINGS
// =====================================
const SHEET_ID = "1OAXNqWCnRYZsE6IDaRHSb9RKmhxwC3k3rRr_D5DHsH0";        // <--- put your ID
const API_KEY  = "AIzaSyA8O56APKbTlz24SeLCmcB3falK13sn34I";  // <--- put your key

// Read sheet
const READ_URL =
  `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Data?key=${API_KEY}`;

// Write sheet
const WRITE_URL =
  `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Data!A:L:append?valueInputOption=RAW&key=${API_KEY}`;

// Update sheet (batch update URL)
const UPDATE_URL =
  `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate?key=${API_KEY}`;


// ======================================
// SAVE INTO GOOGLE SHEET
// ======================================
async function saveToSheet(data) {
  const row = [
    data.name,
    data.file_id,
    data.aadhar,
    data.phone,
    data.pan,
    data.dob,
    data.address,
    data.info,
    data.education,
    data.family,
    data.file_path,
    new Date().toISOString()
  ];

  return await fetch(WRITE_URL, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ values: [row] })
  });
}


// ======================================
// READ + SEARCH GOOGLE SHEET
// ======================================
async function searchSheet(query) {
  const res = await fetch(READ_URL);
  const data = await res.json();

  if (!data.values) return null;

  // Skip header → start from row 1
  for (let i = 1; i < data.values.length; i++) {
    const row = data.values[i];

    const record = {
      row: i + 1,
      name: row[0],
      file_id: row[1],
      aadhar: row[2],
      phone: row[3],
      pan: row[4],
      dob: row[5],
      address: row[6],
      info: row[7],
      education: row[8],
      family: row[9],
      file_path: row[10],
      timestamp: row[11]
    };

    if (
      (query.name && record.name.toLowerCase() === query.name.toLowerCase()) ||
      (query.aadhar && record.aadhar === query.aadhar) ||
      (query.phone && record.phone === query.phone)
    ) {
      return record;
    }
  }

  return null;
}


// ======================================
// UPDATE RECORD
// ======================================
async function updateSheet(rowNumber, updates) {
  const requests = [];

  const columns = [
    "name","file_id","aadhar","phone","pan",
    "dob","address","info","education","family","file_path"
  ];

  let colIndex = 0;
  for (const key in updates) {
    const value = updates[key];
    const col = String.fromCharCode(65 + columns.indexOf(key)); // A,B,C…
    const cell = `${col}${rowNumber}`;

    requests.push({
      updateCells: {
        rows: [{
          values: [{
            userEnteredValue: { stringValue: value }
          }]
        }],
        fields: "userEnteredValue",
        range: {
          sheetId: 0,
          startRowIndex: rowNumber - 1,
          endRowIndex: rowNumber,
          startColumnIndex: columns.indexOf(key),
          endColumnIndex: columns.indexOf(key) + 1
        }
      }
    });

    colIndex++;
  }

  return await fetch(UPDATE_URL, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ requests })
  });
}


// ======================================
// MAIN WORKER ROUTER
// ======================================
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

    // SEARCH (by name, aadhar, or phone)
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
    if (path === "/save" && request.method === "POST") {
      const body = await request.json();
      await saveToSheet(body);
      return new Response(JSON.stringify({ status: "saved" }));
    }

    // UPDATE
    if (path === "/update" && request.method === "POST") {
      const body = await request.json();
      const found = await searchSheet({
        name: body.name,
        aadhar: body.aadhar,
        phone: body.phone
      });

      if (!found) {
        return new Response(JSON.stringify({ error: "not found" }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      await updateSheet(found.row, body.update);
      return new Response(JSON.stringify({ status: "updated" }));
    }

    return new Response(JSON.stringify({ error: "invalid endpoint" }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};