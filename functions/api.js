export const onRequest = async ({ request, next }) => {
  const USERNAME = "IAM";
  const PASSWORD = "HAMER@6362";

  const auth = request.headers.get("Authorization");
  const unauthorized = new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Secure Area"' }
  });

  if (!auth || !auth.startsWith("Basic ")) {
    return unauthorized;
  }

  const encoded = auth.split(" ")[1];
  const decoded = atob(encoded);
  const [user, pass] = decoded.split(":");

  if (user !== USERNAME || pass !== PASSWORD) {
    return unauthorized;
  }

  // If login success → continue to site
  return next();
};
