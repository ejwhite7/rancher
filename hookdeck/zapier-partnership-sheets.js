// Attach only to the Meta/Zapier → Rancher Sheets connection.
addHandler("transform", (request) => {
  const body = request.body;
  if (typeof body === "string") {
    request.body = request.headers["content-type"]?.startsWith(
      "application/x-www-form-urlencoded",
    )
      ? Object.fromEntries(new URLSearchParams(body))
      : JSON.parse(body);
  }
  request.headers = { ...request.headers, "content-type": "application/json" };
  return request;
});
