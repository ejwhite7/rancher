import type { Client } from "@prismicio/client";
import { authorSchema, blogUID, parseBlogRecords } from "./blog";
export class AuthorNotFoundError extends Error {}
export const authorPath = (uid: string) => {
  if (!blogUID.test(uid)) throw Error("Invalid author UID");
  return `/authors/${uid}/`;
};
export async function fetchAuthor(
  client: Client,
  uid: string,
  preview = false,
) {
  authorPath(uid);
  const document = (await client.getAllByType("authors")).find((doc)=>doc.uid === uid);
  if (!document) throw new AuthorNotFoundError("Author not found");
  const data = authorSchema.parse(document.data);
  const articles = parseBlogRecords(
    await client.getAllByType("blog"),
    preview,
  ).filter((article) => article.data.author.id === document.id);
  return { id: document.id, uid, data, articles };
}
