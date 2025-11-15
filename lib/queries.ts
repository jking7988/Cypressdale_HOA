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

    "recentRsvps": *[
      _type == "rsvpResponse" &&
      event._ref == ^._id
    ] | order(createdAt desc)[0..10]{
      status,
      createdAt
    }
  }`;

/* 🔽 UPDATED BLOCK STARTS HERE */
export const documentsQuery = groq`*[_type == "documentFile"]
  | order(category asc, coalesce(uploadedAt, _updatedAt) desc, title asc){
    _id,
    title,
    description,
    category,
    // prefer custom uploadedAt, otherwise fall back to system _updatedAt
    "uploadedAt": coalesce(uploadedAt, _updatedAt),
    "fileUrl": file.asset->url,
    "fileName": file.asset->originalFilename
  }`;
/* 🔼 UPDATED BLOCK ENDS HERE */

export const poolDocumentsQuery = groq`*[
  _type == "documentFile" &&
  category match "Pool*"
] | order(title asc){
  _id,
  title,
  description,
  "fileUrl": file.asset->url
}`;

export const yardWinnersQuery = groq`*[_type == "yardWinner"] | order(month desc) {
  _id,
  title,
  month,
  streetOrBlock,
  description,
  "photoUrl": photo.asset->url
}`;

export const yardWinnerByIdQuery = groq`*[_type == "yardWinner" && _id == $id][0]{
  _id,
  title,
  month,
  streetOrBlock,
  description,
  "photoUrl": photo.asset->url
}`;
