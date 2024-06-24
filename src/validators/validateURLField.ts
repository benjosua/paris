import type { ValidateOptions as PayloadValidateOptions, Validate } from "payload";

export const validateURLField: Validate<string> = async (
  value: string,
  options: PayloadValidateOptions<string, any, any>
) => {
  const { t } = options;

  try {
    const url = new URL(value);
  } catch (err) {
    return t("shared:errors:url:invalid");
  }
  return true;
};
