import configPromise from '@payload-config';
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { DateTime } from 'luxon';
import NodeCache from 'node-cache';
import { getPayload } from 'payload';

const cache = new NodeCache({ stdTTL: 86400 });

interface GeoJson {
  type: string;
  coordinates: number[][];
}

interface LocationData {
  geojson: GeoJson;
  class: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location');

  // Check if location parameter is provided
  if (!location) {
    return new Response("Location parameter is required", { status: 400 });
  }

  try {
    const payload = await getPayload({
      config: configPromise,
    });

    const events = await payload.find({
      collection: 'events',
      limit: 0,
      pagination: false,
      sort: "start",
    });

    events.docs = events.docs.filter((event) => event.coordinates);

    const currentDateTime = DateTime.now();
    const upcomingEvents = events.docs.filter((event) => {
      const eventEndDateTime = DateTime.fromISO(event.end ?? '');
      return eventEndDateTime >= currentDateTime;
    });

    const eventsReq = upcomingEvents.map((event) => ({
      title: event.title,
      start: event.start,
      end: event.end,
      location: event.location,
      coordinates: event.coordinates,
      address: event.address,
      id: event.id,
    }));

    const cacheKey = `locationiq_${location}`;
    let data: LocationData[] | undefined = cache.get(cacheKey);

    if (!data) {
      console.log('Fetching new data from the API for', location);
      const res = await fetch(`https://eu1.locationiq.com/v1/search?format=json&key=${process.env.LOCATIONIQ_API_KEY}&q=${encodeURIComponent(location)}&polygon_geojson=1`);

      if (!res.ok) {
        throw new Error(`Failed to fetch location data: ${res.statusText}`);
      }

      data = await res.json();

      if (!data || !data[0] || !data[0].geojson || !(data[0].class === "place" || data[0].class === "boundary")) {
        throw new Error("Invalid location data received");
      }

      cache.set(cacheKey, data);
    } else {
      console.log(`Using cached data for ${location}`);
    }

    const Polygon = {
      type: data[0].geojson.type,
      coordinates: data[0].geojson.coordinates,
    };

    const result = eventsReq.filter((event) => {
      if (event.coordinates && Array.isArray(event.coordinates)) {
        return booleanPointInPolygon(event.coordinates, Polygon);
      }
      return false;
    });

    return new Response(JSON.stringify({ docs: result }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    console.error(error);
    return new Response(`An error occurred`, { status: 500 });
  }
}
