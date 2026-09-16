import type { Client } from "@prismicio/client";
import { authorSchema, blogUID, parseBlogRecords } from "./blog";
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
  const document = await client.getByUID("authors", uid);
  const data = authorSchema.parse(document.data);
  const articles = parseBlogRecords(
    await client.getAllByType("blog"),
    preview,
  ).filter((article) => article.data.author.id === document.id);
  return { id: document.id, uid, data, articles };
}
