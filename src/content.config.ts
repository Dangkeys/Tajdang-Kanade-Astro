import { defineCollection } from "astro:content";
import { sharedPostLoader } from "./lib/post-loader";
import { postSchema } from "./lib/post-metadata";

export const collections = {
  posts: defineCollection({
    loader: sharedPostLoader(),
    schema: postSchema,
  }),
};
