"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioPill } from "@/components/ui/radio-group";
import { DatePicker } from "@/components/ui/date-picker";
import { PlaceAutocomplete } from "@/components/ui/place-autocomplete";

type Props = {
  /** Field name prefix, e.g. "self" or "mother". Empty for a flat single-person form. */
  prefix?: string;
  idPrefix: string;
};

export function PersonFields({ prefix, idPrefix }: Props) {
  const { register, control } = useFormContext();
  const field = (name: string) => (prefix ? `${prefix}.${name}` : name);

  const deceased = useWatch({ control, name: field("deceased") }) as boolean;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-firstName`}>First name</Label>
          <Input
            id={`${idPrefix}-firstName`}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...register(field("firstName") as any)}
            placeholder="First name"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-lastName`}>Last name</Label>
          <Input
            id={`${idPrefix}-lastName`}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...register(field("lastName") as any)}
            placeholder="Last name"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Sex</Label>
        <Controller
          control={control}
          name={field("sex")}
          render={({ field: f }) => (
            <RadioGroup
              className="flex gap-2"
              value={f.value}
              onValueChange={f.onChange}
            >
              <RadioPill value="MALE" label="Male" />
              <RadioPill value="FEMALE" label="Female" />
              <RadioPill value="UNKNOWN" label="Unknown" />
            </RadioGroup>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-birthDate`}>Date of birth</Label>
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
          <Label htmlFor={`${idPrefix}-birthPlace`}>Place of birth</Label>
          <Controller
            control={control}
            name={field("birthPlace")}
            render={({ field: f }) => (
              <PlaceAutocomplete
                id={`${idPrefix}-birthPlace`}
                value={f.value}
                onChange={f.onChange}
                onBlur={f.onBlur}
                placeholder="Search a city or place"
              />
            )}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2">
        <Label htmlFor={`${idPrefix}-deceased`}>Deceased</Label>
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
            <Label htmlFor={`${idPrefix}-deathDate`}>Date of death</Label>
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
            <Label htmlFor={`${idPrefix}-deathPlace`}>Place of death</Label>
            <Controller
              control={control}
              name={field("deathPlace")}
              render={({ field: f }) => (
                <PlaceAutocomplete
                  id={`${idPrefix}-deathPlace`}
                  value={f.value}
                  onChange={f.onChange}
                  onBlur={f.onBlur}
                  placeholder="Search a city or place"
                />
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}
