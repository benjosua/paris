import type { Access } from "payload";

export const isAdminOrHasGroupAccess =
  (GroupIDFieldName = "group"): Access =>
  ({ req: { user } }) => {
    // Need to be logged in
    if (user) {
      // If user has role of 'admin'
      if (user.roles?.includes("admin")) return true;

      // If user has role of 'editor' and has access to a group,
      // return a query constraint to restrict the documents this user can edit
      // to only those that are assigned to a group, or have no group assigned
      if (user.roles?.includes("editor") && (user.groups?.length ?? 0) > 0) {
        // Otherwise, we can restrict it based on the `group` field
        return {
          or: [
            {
              [GroupIDFieldName]: {
                in: user.groups,
              },
            },
            {
              [GroupIDFieldName]: {
                exists: false,
              },
            },
          ],
        };
      }
    }

    // Reject everyone else
    return false;
  };
