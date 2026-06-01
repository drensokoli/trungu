"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioPill } from "@/components/ui/radio-group";
import { DatePicker } from "@/components/ui/date-picker";
import { PlaceAutocomplete } from "@/components/ui/place-autocomplete";
import { useT } from "@/lib/i18n";
import { capitalizeName } from "@/lib/utils";

type Props = {
  /** Field name prefix, e.g. "self" or "mother". Empty for a flat single-person form. */
  prefix?: string;
  idPrefix: string;
};

export function PersonFields({ prefix, idPrefix }: Props) {
  const { register, control } = useFormContext();
  const t = useT();
  const field = (name: string) => (prefix ? `${prefix}.${name}` : name);

  // Auto-capitalize the first letter of each word as the user types a name.
  const nameField = (name: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reg = register(name as any);
    return {
      ...reg,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        e.target.value = capitalizeName(e.target.value);
        return reg.onChange(e);
      },
    };
  };

  const deceased = useWatch({ control, name: field("deceased") }) as boolean;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-firstName`}>{t("field.firstName")}</Label>
          <Input
            id={`${idPrefix}-firstName`}
            {...nameField(field("firstName"))}
            placeholder={t("field.firstName")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-lastName`}>{t("field.lastName")}</Label>
          <Input
            id={`${idPrefix}-lastName`}
            {...nameField(field("lastName"))}
            placeholder={t("field.lastName")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{t("field.sex")}</Label>
        <Controller
          control={control}
          name={field("sex")}
          render={({ field: f }) => (
            <RadioGroup
              className="flex gap-2"
              value={f.value}
              onValueChange={f.onChange}
            >
              <RadioPill value="MALE" label={t("sex.MALE")} />
              <RadioPill value="FEMALE" label={t("sex.FEMALE")} />
              <RadioPill value="UNKNOWN" label={t("sex.UNKNOWN")} />
            </RadioGroup>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-birthDate`}>{t("field.birthDate")}</Label>
          <Controller
            control={control}
            name={field("birthDate")}
            render={({ field: f }) => (
              <DatePicker
                id={`${idPrefix}-birthDate`}
                value={f.value}
                onChange={f.onChange}
              />
            )}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-birthPlace`}>{t("field.birthPlace")}</Label>
          <Controller
            control={control}
            name={field("birthPlace")}
            render={({ field: f }) => (
              <PlaceAutocomplete
                id={`${idPrefix}-birthPlace`}
                value={f.value}
                onChange={f.onChange}
                onBlur={f.onBlur}
                placeholder={t("field.searchPlace")}
              />
            )}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2">
        <Label htmlFor={`${idPrefix}-deceased`}>{t("field.deceased")}</Label>
        <Controller
          control={control}
          name={field("deceased")}
          render={({ field: f }) => (
            <Switch
              id={`${idPrefix}-deceased`}
              checked={!!f.value}
              onCheckedChange={f.onChange}
            />
          )}
        />
      </div>

      {deceased && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-deathDate`}>{t("field.deathDate")}</Label>
            <Controller
              control={control}
              name={field("deathDate")}
              render={({ field: f }) => (
                <DatePicker
                  id={`${idPrefix}-deathDate`}
                  value={f.value}
                  onChange={f.onChange}
                />
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-deathPlace`}>{t("field.deathPlace")}</Label>
            <Controller
              control={control}
              name={field("deathPlace")}
              render={({ field: f }) => (
                <PlaceAutocomplete
                  id={`${idPrefix}-deathPlace`}
                  value={f.value}
                  onChange={f.onChange}
                  onBlur={f.onBlur}
                  placeholder={t("field.searchPlace")}
                />
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}
