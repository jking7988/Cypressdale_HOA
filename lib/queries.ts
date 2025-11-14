import {groq} from 'next-sanity';

export const homeQuery = groq`{
  "posts": *[_type == "post"] | order(_createdAt desc)[0..5]{
    _id,
    title,
    excerpt,
    body,
    _createdAt
  },
  // reuse the same logic as eventsQuery
  "events": *[_type == "event"]
    | order(coalesce(startDate, start) asc)[0..50]{
      _id,
      title,
      description,
      location,
      // normalize to startDate/endDate for React
      "startDate": coalesce(startDate, start),
      "endDate": coalesce(endDate, end),
      rsvpYes,
      rsvpMaybe
    }
}`;

export const postsQuery = groq`*[_type == "post"] | order(_createdAt desc) {
  _id,
  title,
  excerpt,
  body,
  _createdAt
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
    rsvpMaybe
  }`;

export const documentsWithFoldersQuery = groq`
{
  "folders": *[_type == "documentFolder"]{
    _id,
    title,
    "parentId": parent._ref
  },
  "files": *[_type == "documentFile"]{
    _id,
    title,
    category,
    description,
    "fileUrl": file.asset->url,
    "folderId": folder._ref
  }
}
`;
