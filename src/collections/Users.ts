import type { CollectionConfig } from "payload";

import { isAdmin, isAdminFieldLevel } from "@/access/isAdmin";
import { isAdminOrSelf } from "@/access/isAdminOrSelf";

export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    // This property controls how deeply "populated"
    // relationship docs are that are stored in the req.user.
    // It should be kept to as low as possible, which
    // keeps performance fast.
    depth: 0,
    useAPIKey: true,
  },
  admin: {
    useAsTitle: "firstName",
  },
  access: {
    // Only admins can create users
    create: isAdmin,
    // Admins can read all, but any other logged in user can only read themselves
    read: isAdminOrSelf,
    // Admins can update all, but any other logged in user can only update themselves
    update: isAdminOrSelf,
    // Only admins can delete
    delete: isAdmin,
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "firstName",
          type: "text",
          required: true,
        },
        {
          name: "lastName",
          type: "text",
          required: true,
        },
      ],
    },
    {
      name: "roles",
      // Save this field to JWT so we can use from `req.user`
      saveToJWT: true,
      type: "select",
      hasMany: true,
      defaultValue: ["editor"],
      access: {
        // Only admins can create or update a value for this field
        create: isAdminFieldLevel,
        update: isAdminFieldLevel,
      },
      options: [
        {
          label: "Admin",
          value: "admin",
        },
        {
          label: "Editor",
          value: "editor",
        },
      ],
    },
    {
      name: "groups",
      // Save this field to JWT so we can use from `req.user`
      saveToJWT: true,
      type: "relationship",
      relationTo: "groups",
      hasMany: true,
      access: {
        // Only admins can create or update a value for this field
        create: isAdminFieldLevel,
        update: isAdminFieldLevel,
      },
      admin: {
        condition: ({ roles }) => roles && !roles.includes("admin"),
        description:
          "This field sets which groups that this user has access to.",
      },
    },
  ],
};
