import type { CollectionConfig } from "payload";

import { isAdmin, isAdminFieldLevel } from "@/access/isAdmin";
import { isLoggedIn } from "@/access/isLoggedIn";
import { validateSlug } from "@/validators/validateSlug";

export const Tags: CollectionConfig = {
  slug: "tags",
  admin: {
    useAsTitle: "title",
  },
  access: {
    // Only admins can create
    create: isAdmin,
    // Only admins or editors with group access can read
    read: isLoggedIn,
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
      validate: validateSlug,
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
};
