import {defineLive} from "next-sanity/live";
import {client} from "@/lib/sanity.client";

export const {sanityFetch, SanityLive} = defineLive({
  client,
  serverToken: process.env.SANITY_API_READ_TOKEN,
  browserToken: false,
});
