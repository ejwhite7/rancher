import { test, expect } from "@playwright/test";
import { handleSubmission } from "../src/server/submission-handler";
import { handleContactSubmission } from "../src/server/contact-handler";
import { handleReferralSubmission } from "../src/server/referral-handler";

const endpoints = [
  [
    "partnership",
    (request: Request, save: () => Promise<void>) =>
      handleSubmission(request, {
        save,
        bookingUrl: () => {
          throw Error("must not book invalid input");
        },
      }),
  ],
  [
    "contact",
    (request: Request, save: () => Promise<void>) =>
      handleContactSubmission(request, { save }),
  ],
  [
    "referral",
    (request: Request, save: () => Promise<void>) =>
      handleReferralSubmission(request, { save }),
  ],
] as const;
const url = "https://www.gorancher.com/api/form/";
const makeRequest = (
  body: ReadableStream<Uint8Array> | null,
  headers = { "Content-Type": "application/json" },
) =>
  new Request(url, {
    method: "POST",
    headers,
    body,
    duplex: "half",
  } as RequestInit);

async function expectError(response: Response, status: number, error: string) {
  expect(response.status).toBe(status);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("Allow")).toBeNull();
  expect(await response.json()).toEqual({ error });
}

type Handle = (typeof endpoints)[number][1];

async function expectOversizedCancellation(
  handle: Handle,
  save: () => Promise<void>,
) {
  for (const cancelFails of [false, true]) {
    let cancelled = 0;
    const oversized = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(16_384));
        controller.enqueue(new Uint8Array([32]));
      },
      cancel() {
        cancelled++;
        if (cancelFails) throw Error("cancel failed");
      },
    });
    await expectError(
      await handle(makeRequest(oversized), save),
      cancelFails ? 400 : 413,
      cancelFails
        ? "Submission could not be read."
        : "Submission is too large.",
    );
    expect(cancelled).toBe(1);
  }
}

async function expectUnreadableInputs(
  handle: Handle,
  save: () => Promise<void>,
) {
  await expectError(
    await handle(makeRequest(null), save),
    400,
    "Submission is empty.",
  );
  for (const text of ["", "{", "null"]) {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      },
    });
    await expectError(
      await handle(makeRequest(body), save),
      400,
      text === "null"
        ? "Please complete every required field with valid information."
        : "Submission could not be read.",
    );
  }
  const failed = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.error(Error("read failed"));
    },
  });
  await expectError(
    await handle(makeRequest(failed), save),
    400,
    "Submission could not be read.",
  );
}

for (const [name, handle] of endpoints) {
  test(`${name} transport preserves guard order without reading or saving`, async () => {
    let reads = 0;
    let saves = 0;
    const save = async () => {
      saves++;
    };
    const unread = () =>
      new ReadableStream<Uint8Array>(
        {
          pull() {
            reads++;
            throw Error("must not read");
          },
        },
        { highWaterMark: 0 },
      );
    const method = await handle(
      new Request(url, {
        method: "PUT",
        headers: {
          "Content-Type": "text/plain",
          Origin: "https://other.example",
        },
        body: unread(),
        duplex: "half",
      } as RequestInit),
      save,
    );
    expect(method.status).toBe(405);
    expect(method.headers.get("Allow")).toBe("POST");
    expect(method.headers.get("Cache-Control")).toBeNull();
    expect(await method.text()).toBe("");
    await expectError(
      await handle(
        makeRequest(unread(), {
          "Content-Type": "text/plain",
          Origin: "https://other.example",
        } as any),
        save,
      ),
      415,
      "Send a JSON submission.",
    );
    await expectError(
      await handle(
        makeRequest(unread(), {
          "Content-Type": "application/json",
          Origin: "https://other.example",
        } as any),
        save,
      ),
      403,
      "Submit this form from the Rancher website.",
    );
    expect(reads).toBe(0);
    expect(saves).toBe(0);
  });

  test(`${name} transport preserves byte and cancellation/read failure behavior`, async () => {
    let saves = 0;
    const save = async () => {
      saves++;
    };
    await expectOversizedCancellation(handle, save);
    await expectUnreadableInputs(handle, save);
    // Multibyte JSON split inside a UTF-8 character, padded to the exact byte limit.
    const bytes = new Uint8Array(16_384).fill(32);
    bytes.set(new TextEncoder().encode('{"name":"é"}'));
    const boundary = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 10));
        controller.enqueue(bytes.slice(10));
        controller.close();
      },
    });
    await expectError(
      await handle(
        makeRequest(boundary, {
          "Content-Type": "APPLICATION/JSON; charset=utf-8",
        }),
        save,
      ),
      400,
      "Please complete every required field with valid information.",
    );
    expect(saves).toBe(0);
  });
}
