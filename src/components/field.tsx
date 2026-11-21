import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

/** Labelled text input for server-action forms. */
export function TextField({
  label,
  name,
  className,
  idPrefix = "f",
  ...props
}: { label: string; name: string; idPrefix?: string } & ComponentProps<typeof Input>) {
  const id = props.id ?? `${idPrefix}-${name}`;
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} {...props} />
    </div>
  );
}

export interface Option {
  value: string;
  label: string;
}

/** Labelled native select (submits with the form, works without JS). */
export function SelectField({
  label,
  name,
  options,
  placeholder,
  className,
  idPrefix = "f",
  ...props
}: {
  label: string;
  name: string;
  options: readonly Option[];
  placeholder?: string;
  className?: string;
  /** Distinct per form when several forms on one page share field names. */
  idPrefix?: string;
} & Omit<ComponentProps<"select">, "size">) {
  const id = props.id ?? `${idPrefix}-${name}`;
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} name={name} className="w-full min-w-40" {...props}>
        {placeholder !== undefined && (
          <NativeSelectOption value="">{placeholder}</NativeSelectOption>
        )}
        {options.map((o) => (
          <NativeSelectOption key={o.value} value={o.value}>
            {o.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}

export function FormRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end gap-3">{children}</div>;
}
