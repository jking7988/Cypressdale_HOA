import { groq } from 'next-sanity';

export const homeQuery = groq`{
  "posts": *[_type == "post"] | order(_createdAt desc)[0..5]{ _id, title, excerpt, body },
"events": *[_type == "event" && dateTime(coalesce(startDate, start)) >= now()] 
  | order(coalesce(startDate, start) asc)[0..4]{
    _id,
    title,
    "startDate": coalesce(startDate, start),
    "endDate": coalesce(endDate, end),
    location,
    description
  }`;

export const postsQuery = groq`*[_type == "post"] | order(_createdAt desc) {
  _id,
  title,
  excerpt,
  body,
  _createdAt
}`;

export const eventsQuery = groq`*[_type == "event" && defined(coalesce(startDate, start))]
  | order(coalesce(startDate, start) asc) {
    _id,
    title,
    description,
    location,
    "startDate": coalesce(startDate, start),
    "endDate": coalesce(endDate, end)
  }`;

export const documentsQuery = groq`*[_type == "documentFile"] | order(_createdAt desc){ _id, title, description, category, "fileUrl": file.asset->url }`;
