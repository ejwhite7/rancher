// Attach only to the Meta/Zapier → Rancher Sheets connection.
const decodeForm = (value) => decodeURIComponent(value.replace(/\+/g, " "));
function parseForm(body) {
  return Object.fromEntries(
    body
      .split("&")
      .filter(Boolean)
      .map((pair) => {
        const equals = pair.indexOf("=");
        return equals < 0
          ? [decodeForm(pair), ""]
          : [
              decodeForm(pair.slice(0, equals)),
              decodeForm(pair.slice(equals + 1)),
            ];
      }),
  );
}
addHandler("transform", (request) => {
  const body = request.body;
  if (typeof body === "string") {
    request.body = request.headers["content-type"]?.startsWith(
      "application/x-www-form-urlencoded",
    )
      ? parseForm(body)
      : JSON.parse(body);
  }
  request.headers = { ...request.headers, "content-type": "application/json" };
  return request;
});
