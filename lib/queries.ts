import { groq } from 'next-sanity';

export const homeQuery = groq`{
  "posts": *[_type == "post"] | order(_createdAt desc)[0..5]{ _id, title, excerpt, body },
  "events": *[_type == "event" && dateTime(start) >= now()] | order(start asc)[0..4]{ _id, title, start, end, location, description }
}`;

export const postsQuery = groq`*[_type == "post"] | order(_createdAt desc) {
  _id,
  title,
  excerpt,
  body,
  _createdAt
}`;

export const eventsQuery = groq`*[_type == "event" && defined(startDate)] | order(startDate asc) {
  _id,
  title,
  description,
  location,
  startDate,
  endDate
}`;

export const documentsQuery = groq`*[_type == "documentFile"] | order(_createdAt desc){ _id, title, description, category, "fileUrl": file.asset->url }`;
