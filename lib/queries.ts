import {groq} from 'next-sanity';

export const homeQuery = groq`{
  "posts": *[_type == "post"] | order(_createdAt desc)[0..5]{
    _id,
    title,
    slug,
    excerpt,
    body,
    _createdAt
  },
  "events": *[_type == "event"]
    | order(coalesce(startDate, start) asc)[0..50]{
      _id,
      title,
      description,
      location,
      "startDate": coalesce(startDate, start),
      "endDate": coalesce(endDate, end),
      rsvpYes,
      rsvpMaybe,
      "flyerUrl": flyer.asset->url,
      "flyerMime": flyer.asset->mimeType,
      "flyerName": flyer.asset->originalFilename,

      "recentRsvps": *[
        _type == "rsvpResponse" &&
        event._ref == ^._id
      ] | order(createdAt desc)[0..10]{
        status,
        createdAt
      }
    }
}`;

export const postsQuery = groq`*[_type == "post"]
  | order(coalesce(newsDate, publishedAt, _createdAt) desc) {
    _id,
    title,
    excerpt,
    body,
    _createdAt,
    publishedAt,
    newsDate
  }`;

export const eventsQuery = groq`*[_type == "event"]
  | order(coalesce(startDate, start) asc){
    _id,
    title,
    description,
    location,
    "startDate": coalesce(startDate, start),
    "endDate": coalesce(endDate, end),
    rsvpYes,
    rsvpMaybe,
    "flyerUrl": flyer.asset->url,
    "flyerMime": flyer.asset->mimeType,
    "flyerName": flyer.asset->originalFilename,

    // 🔒 anonymized recent RSVP activity
    "recentRsvps": *[
      _type == "rsvpResponse" &&
      event._ref == ^._id
    ] | order(createdAt desc)[0..10]{
      status,
      createdAt
    }
  }`;

// queries.ts
export const documentsQuery = groq`*[_type == "documentFile"] | order(category asc, title asc){
  _id,
  title,
  description,
  category,
  "fileUrl": file.asset->url
}`;

export const poolDocumentsQuery = groq`*[
  _type == "documentFile" &&
  category match "Pool*"
] | order(title asc){
  _id,
  title,
  description,
  "fileUrl": file.asset->url
}`;