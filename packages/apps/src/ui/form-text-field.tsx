import type { ReactNode } from "react";
import type { FieldPath, FieldValues } from "react-hook-form";
import { useFormContext } from "react-hook-form";

import { Input } from "@/ui/input";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";

export type FormTextFieldProps<TFieldValues extends FieldValues> = {
  name: FieldPath<TFieldValues>;
  label: ReactNode;
  /** Merged onto `FormItem` (layout, spacing). */
  itemClassName?: string;
  /** Merged onto `FormLabel`. */
  labelClassName?: string;
} & Omit<
  React.ComponentPropsWithoutRef<typeof Input>,
  "defaultChecked" | "defaultValue" | "name" | "onBlur" | "onChange" | "ref" | "value"
>;

/**
 * Opinionated text `Input` bound to react-hook-form (`FormField` + `Controller` from `@/ui/form`).
 * Must be rendered under `<Form>` (same as {@link useFormContext}).
 */
export function FormTextField<TFieldValues extends FieldValues>({
  name,
  label,
  itemClassName,
  labelClassName,
  ...inputProps
}: FormTextFieldProps<TFieldValues>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={itemClassName}>
          <FormLabel className={labelClassName}>{label}</FormLabel>
          <FormControl>
            <Input {...inputProps} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
