import {groq} from 'next-sanity';

export const homeQuery = groq`{
  "posts": *[_type == "post"] | order(_createdAt desc)[0..5]{
    _id,
    title,
    excerpt,
    body,
    _createdAt
  },
  "events": *[_type == "event" && defined(startDate)]
    | order(startDate asc)[0..50]{
      _id,
      title,
      description,
      location,
      startDate,
      endDate
    }
}`;

export const postsQuery = groq`*[_type == "post"] | order(_createdAt desc){
  _id,
  title,
  excerpt,
  body,
  _createdAt
}`;

export const eventsQuery = groq`*[_type == "event" && defined(coalesce(startDate, start))]
  | order(coalesce(startDate, start) asc){
    _id,
    title,
    description,
    location,
    "startDate": coalesce(startDate, start),
    "endDate": coalesce(endDate, end),
    rsvpYes,
    rsvpMaybe
  }`;

export const documentsQuery = groq`*[_type == "documentFile"] | order(_createdAt desc){
  _id,
  title,
  description,
  category,
  "fileUrl": file.asset->url
}`;
