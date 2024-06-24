import type { ValidateOptions as PayloadValidateOptions, Validate } from "payload";

export const validateSlug: Validate<string> = async (
  value: string,
  options: PayloadValidateOptions<string, any, any>
) => {
  const { t } = options;

  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  if (!slugPattern.test(value)) {
    return t("shared:errors:slug:invalid");
  }

  return true;
};
