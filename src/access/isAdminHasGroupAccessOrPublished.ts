import type { Access, AccessArgs, AccessResult } from "payload";

export const isAdminOrHasGroupAccessOrPublished: Access = ({
  req: { user },
}: AccessArgs<any>): AccessResult | Promise<AccessResult> => {
  // Need to be logged in
  if (user) {
    // If user has role of 'admin'
    if (user.roles?.includes("admin")) return true;

    // If user has role of 'editor' and has access to a group,
    // return a query constraint to restrict the documents this user can edit
    // to only those that are assigned to a group, or have no group assigned
    if (user.roles?.includes("editor") && (user.groups?.length ?? 0) > 0) {
      return {
        or: [
          {
            group: {
              in: user.groups,
            },
          },
          {
            group: {
              exists: false,
            },
          },
        ],
      };
    }
  }

  // Non-logged in users can only read published docs
  return {
    _status: {
      equals: "published",
    },
  };
};
