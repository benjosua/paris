import DOMPurify from "isomorphic-dompurify";
import type { CollectionConfig, User } from "payload";

import { isAdminFieldLevel } from "@/access/isAdmin";
import { isAdminOrHasGroupAccessOrPublished } from "@/access/isAdminHasGroupAccessOrPublished";
import { isAdminOrHasGroupAccess } from "@/access/isAdminOrHasGroupAccess";
import { isLoggedIn } from "@/access/isLoggedIn";

export const Events: CollectionConfig = {
  slug: "events",
  admin: {
    useAsTitle: "title",
  },
  versions: {
    drafts: true,
  },
  access: {
    // Anyone logged in can create
    create: isLoggedIn,
    // Only admins or editors with  access can update
    update: isAdminOrHasGroupAccess(),
    // Admins or editors with  access can read,
    // otherwise users not logged in can only read published
    read: isAdminOrHasGroupAccessOrPublished,
    // Only admins can delete
    delete: isAdminOrHasGroupAccess(),
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      type: "date",
      label: "Start",
      name: "start",
      admin: {
        date: {
          pickerAppearance: "dayAndTime",
          timeFormat: "HH:mm",
          // displayFormat: "MMM d, yyyy HH:mm",
        },
      },
      validate: (value, { data }) => {
        if (value >= data.end) {
          return "Start time must be before end time";
        } else {
          return true;
        }
      },
    },
    {
      type: "date",
      label: "End",
      name: "end",
      admin: {
        date: {
          pickerAppearance: "dayAndTime",
          timeFormat: "HH:mm",
          // displayFormat: "MMM d, yyyy HH:mm",
        },
      },
      validate: (value, { data }) => {
        if (value <= data.start) {
          return "End time must be after start time";
        } else {
          return true;
        }
      },
    },
    {
      name: "description",
      type: "textarea",
      required: true,
    },
    {
      name: "organizer",
      type: "relationship",
      relationTo: "users",
      hasMany: false,
    },
    {
      name: "location",
      type: "text",
      required: true,
      label: "Location",
    },
    {
      name: "address", // required
      type: "json", // required
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        readOnly: true,
      },
    },
    {
      name: "coordinates",
      type: "point",
      label: "Coordinates",
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        readOnly: true,
      },
    },
    {
      name: "group",
      label: "Group",
      type: "relationship",
      relationTo: "groups",
      required: true,
      // If user is not admin, set the  by default
      // to the first  that they have access to
      defaultValue: ({ user }: { user: User }) => {
        if (!user.roles.includes("admin") && user.groups?.[0]) {
          return user.groups[0];
        }
      },
    },
    {
      name: "tags",
      label: "Tags",
      type: "relationship",
      relationTo: "tags",
      hasMany: true,
    },
    {
      name: "createdBy",
      type: "relationship",
      relationTo: "users",
      access: {
        read: isAdminFieldLevel,
        update: () => false,
      },
      admin: {
        readOnly: true,
        condition: (data) => Boolean(data?.createdBy),
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        if (operation === "create") {
          if (req.user) {
            data.createdBy = req.user.id;
            return data;
          }
        }
      },
      ({ operation, data }) => {
        // sanitize the title, description, and location
        if (operation === "create" || operation === "update") {
          if (data.title) {
            data.title = DOMPurify.sanitize(data.title);
          }
          if (data.description) {
            data.description = DOMPurify.sanitize(data.description);
          }
          if (data.location) {
            data.location = DOMPurify.sanitize(data.location);
          }
          return data;
        }
      },
      async ({ data }: { data: any }) => {
        if (data?.location) {
          try {
            const url = new URL("https://api.locationiq.com/v1/search");
            const params = {
              q: data.location,
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

            // Fetch data from the API
            const response = await fetch(url);

            // Check if the response is OK
            if (!response.ok) {
              throw new Error(`HTTP error: ${response.status}`);
            }

            // Parse the response data as JSON
            const apiData = await response.json();

            // Extract latitude and longitude from the first item in the array
            const lat = parseFloat(apiData[0].lat);
            const lon = parseFloat(apiData[0].lon);
            data.coordinates = [lon, lat];
            data.address = apiData[0].address;
            return data;
          } catch (error: unknown) {
            // eslint-disable-next-line no-console
            console.error("Error retrieving data from API:", error);
          }
        }
      },
    ],
  },
};
