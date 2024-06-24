import DOMPurify from "isomorphic-dompurify";
import type { CollectionConfig } from "payload";

import { isAdmin, isAdminFieldLevel } from "@/access/isAdmin";
import { isAdminOrHasGroupAccess } from "@/access/isAdminOrHasGroupAccess";

export const Groups: CollectionConfig = {
  slug: "groups",
  admin: {
    useAsTitle: "title",
  },
  access: {
    // Only admins can create
    create: isAdmin,
    // Only admins or editors with group access can read
    read: isAdminOrHasGroupAccess("id"),
    // Only admins can update
    update: isAdmin,
    // Only admins can delete
    delete: isAdmin,
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      validate: async (val, { operation }) => {
        const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        if (!slugPattern.test(val)) {
          return "Slug must be lowercase, hyphen-separated and contain only letters and numbers";
        } else {
          return true;
        }
        },
    },
    {
      name: "description",
      type: "textarea",
      required: false,
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
      name: "enableAutoPosts",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "apiKey",
      type: "text",
      admin: {
        condition: (data) => {
          if (data.enableAutoPosts) {
            return true;
          } else {
            return false;
          }
        },
      },
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
      async ({ data }) => {
        if (data?.location) {
          try {
            const url = new URL("https://eu1.locationiq.com/v1/search");
            const params: { [key: string]: string | number | undefined } = {
              q: data.location,
              format: "json",
              addressdetails: 1,
              normalizeaddress: 1,
              key: process.env.LOCATIONIQ_API_KEY,
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
