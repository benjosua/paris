import configPromise from "@payload-config";
import type { EventAttributes } from "ics";
import { createEvents } from "ics";
import { DateTime } from "luxon";
import { NextRequest, NextResponse } from "next/server";
import NodeCache from "node-cache";
import { getPayload } from "payload";

const cache = new NodeCache({ stdTTL: 600 });
const iqCache = new NodeCache({ stdTTL: 24 * 60 * 60 });
const secondLevelDomainMatch = process.env.NEXT_PUBLIC_SERVER_URL?.match(
  /^(?:https?:\/\/)?(?:www\.)?([^\/]+)/
);
const secondLevelDomain = secondLevelDomainMatch
  ? secondLevelDomainMatch[1]
  : "calendar";

function convertToEvents(docs: any): EventAttributes[] {
  const now = DateTime.now(); // Use Luxon's DateTime to get the current date and time
  const twoWeeksAgo = now.minus({ weeks: 2 }); // Calculate the date two weeks ago from now

  return docs
    .map((doc: any) => {
      const start = DateTime.fromISO(doc.start, { zone: "utc" }); // Parse the date string using Luxon
      const end = DateTime.fromISO(doc.end, { zone: "utc" }); // Parse the date string using Luxon

      if (end >= twoWeeksAgo) {
        const event = {
          productId: `${secondLevelDomain}/ics`,
          uid: doc.id,
          startInputType: "utc", // I define the start time as UTC
          endInputType: "utc",
          start: start
            .toFormat("yyyy-M-d-H-m")
            .split("-")
            .map((str) => parseInt(str)),
          end: end
            .toFormat("yyyy-M-d-H-m")
            .split("-")
            .map((str) => parseInt(str)),
          title: doc.title,
          description: doc.description,
          location: doc.location,
          alarms: [
            {
              action: "audio",
              description: "Reminder",
              trigger: { hours: 4, before: true },
              repeat: 2,
              attachType: "VALUE=URI",
              attach: "Glass",
            },
            {
              action: "audio",
              description: "Reminder",
              trigger: { days: 1, before: true },
              repeat: 2,
              attachType: "VALUE=URI",
              attach: "Glass",
            },
          ],
          url: `${process.env.NEXT_PUBLIC_SERVER_URL}/events/${doc.id}`,
        };

        return event;
      }
      return null;
    })
    .filter((event: unknown) => event !== null);
}

export const GET = async (request: NextRequest) => {
  const payload = await getPayload({
    config: configPromise,
  });

  const { group, geo, id, tag } = Object.fromEntries(
    request.nextUrl.searchParams
  );
  let cacheKey = `events_${group || geo || id || tag || "all"}`; // Generate a unique cache key based on query

  // Check if data is available in cache
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    const responseData =
      typeof cachedData === "string" ? cachedData : JSON.stringify(cachedData);
    return new NextResponse(responseData, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar",
        "Content-Disposition": "attachment; filename=calendar.ics",
      },
    });
  }

  if (
    (typeof group !== "string" && group) ||
    (typeof geo !== "string" && geo) ||
    (typeof id !== "string" && id) ||
    (typeof tag !== "string" && tag)
  ) {
    return new NextResponse("Invalid query parameters", {
      status: 400,
    });
  }

  let queryParams = [group, geo, id, tag];
  let count = queryParams.filter(Boolean).length;

  if (!group && !geo && !id && !tag) {
    const events = await payload.find({
      collection: "events",
      where: {},
      pagination: false,
      limit: 0,
      depth: 0,
    });
    const result = createEvents(
      convertToEvents(events.docs.filter((doc) => doc._status !== "draft"))
    );
    cache.set(cacheKey, result.value);
    return new NextResponse(result.value, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar",
        "Content-Disposition": "attachment; filename=calendar.ics",
      },
    });
  }

  if (count !== 1) {
    return new NextResponse(
      "Only one of 'group', 'geo', 'id', or 'tag' parameters can be used",
      {
        status: 400,
      }
    );
  }

  if (typeof group == "string") {
    const groupArray = group ? group.split(",") : [];
    const eventsByGroup = await payload.find({
      collection: "events",
      where: {
        "group.slug": {
          in: groupArray,
        },
        _status: {
          equals: "published",
        },
      },
      pagination: false,
      depth: 1,
    });
    const result = createEvents(
      convertToEvents(
        eventsByGroup.docs.filter((doc) => doc._status !== "draft")
      )
    );
    cache.set(cacheKey, result.value);

    console.log(result.error);

    return new NextResponse(result.value, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar",
        "Content-Disposition": "attachment; filename=calendar.ics",
      },
    });
  }

  if (typeof tag == "string") {
    const tagArray = tag ? tag.split(",") : [];
    const eventsByTag = await payload.find({
      collection: "events",
      where: {
        "tags.slug": {
          in: tagArray,
        },
        _status: {
          equals: "published",
        },
      },
      pagination: false,
      depth: 1,
    });
    console.log(eventsByTag);
    const result = createEvents(
      convertToEvents(eventsByTag.docs.filter((doc) => doc._status !== "draft"))
    );
    cache.set(cacheKey, result.value);

    console.log(result.error);

    return new NextResponse(result.value, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar",
        "Content-Disposition": "attachment; filename=calendar.ics",
      },
    });
  }

  if (typeof id == "string") {
    const event = await payload.findByID({
      collection: "events",
      id: id,
      depth: 1,
    });
    const result = createEvents(
      convertToEvents(event._status !== "draft" ? [event] : [])
    );
    cache.set(cacheKey, result.value);

    return new NextResponse(result.value, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar",
        "Content-Disposition": "attachment; filename=calendar.ics",
      },
    });
  }

  if (geo) {
    // Define a cache key specific to this geo query
    const iqCacheKey = `locationiq_${geo}`;

    // Attempt to retrieve the cached response
    let cachedResponse = iqCache.get(iqCacheKey);

    if (cachedResponse) {
      // If a cached response exists, use it instead of making a new API call
      // eslint-disable-next-line no-console
      console.log("Using cached data for geo:", geo);
    } else {
      // If there is no cached response, proceed with the API call
      const url = new URL("https://api.locationiq.com/v1/search");
      const params = {
        q: geo,
        format: "json",
        key: process.env.LOCATIONIQ_API_KEY,
        polygon_geojson: 1,
        limit: 1,
        dedupe: 1,
      };

      for (const key in params) {
        if (params.hasOwnProperty(key)) {
          const value = params[key as keyof typeof params];
          if (value !== undefined) {
            url.searchParams.append(key, value.toString());
          }
        }
      }

      const response = await fetch(url);
      // Assuming the response is JSON
      const data = await response.json();
      // Cache the response data
      iqCache.set(iqCacheKey, data);

      // Update `cachedResponse` with the new data so it can be used below
      cachedResponse = data;

      // eslint-disable-next-line no-console
      console.log("Fetched and cached new data for geo:", geo);
    }

    const polygon = (cachedResponse as Array<any>)[0]?.geojson?.coordinates;
    const geoType = (cachedResponse as Array<any>)[0]?.geojson?.type;

    if (!polygon || (geoType !== "Polygon" && geoType !== "MultiPolygon")) {
      // 400 "Invalid Geo Data"
      return new NextResponse("Invalid Geo Data", {
        status: 400,
      });
    }

    const eventCollection = payload.db.collections.events;
    const eventsByGeo = await eventCollection.find(
      {
        coordinates: {
          $geoWithin: {
            $geometry: {
              type: geoType,
              coordinates: polygon,
            },
          },
        },
      },
      { _id: 1 }
    );
    if (eventsByGeo && eventsByGeo.length > 0) {
      const docs = await payload.find({
        collection: "events",
        pagination: false,
        limit: 0,
        depth: 0,
        where: {
          id: {
            in: eventsByGeo.map((event) => event._id),
          },
        },
      });

      const result = createEvents(
        convertToEvents(docs.docs.filter((doc) => doc._status !== "draft"))
      );
      cache.set(cacheKey, result.value);
      return new NextResponse(result.value, {
        status: 200,
        headers: {
          "Content-Type": "text/calendar",
          "Content-Disposition": "attachment; filename=calendar.ics",
        },
      });
    } else {
      return new NextResponse("No events found", {
        status: 404,
      });
    }
  } else {
    return new NextResponse(
      "Missing required 'group', 'geo', 'id', or 'tag' parameter",
      {
        status: 400,
      }
    );
  }
};
