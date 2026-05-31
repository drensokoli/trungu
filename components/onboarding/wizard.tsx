"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { PersonFields } from "./person-fields";
import type { OnboardingInput, PersonInput } from "@/lib/validations";

const emptyPerson = (sex: PersonInput["sex"]): PersonInput => ({
  firstName: "",
  lastName: "",
  sex,
  birthDate: "",
  birthPlace: "",
  deceased: false,
  deathDate: "",
  deathPlace: "",
});

const STEPS = ["You", "Parents", "Grandparents"] as const;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function OnboardingWizard({
  initialFirstName,
  initialLastName,
}: {
  initialFirstName: string;
  initialLastName: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const methods = useForm<OnboardingInput>({
    defaultValues: {
      self: { ...emptyPerson("UNKNOWN"), firstName: initialFirstName, lastName: initialLastName },
      mother: emptyPerson("FEMALE"),
      father: emptyPerson("MALE"),
      maternalGrandmother: emptyPerson("FEMALE"),
      maternalGrandfather: emptyPerson("MALE"),
      paternalGrandmother: emptyPerson("FEMALE"),
      paternalGrandfather: emptyPerson("MALE"),
    },
  });

  const { getValues } = methods;

  function validateStep(current: number): string | null {
    const v = getValues();
    if (current === 0 && !v.self.firstName?.trim())
      return "Please enter your first name.";
    if (current === 1) {
      if (!v.mother.firstName?.trim()) return "Please enter your mother's first name.";
      if (!v.father.firstName?.trim()) return "Please enter your father's first name.";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit() {
    for (let i = 0; i < STEPS.length; i++) {
      const err = validateStep(i);
      if (err) {
        setStep(i);
        setError(err);
        return;
      }
    }
    setSubmitting(true);
    setError(null);

    const v = getValues();
    const stripEmpty = (p?: PersonInput) =>
      p && p.firstName?.trim() ? p : undefined;

    const payload = {
      self: v.self,
      mother: v.mother,
      father: v.father,
      maternalGrandmother: stripEmpty(v.maternalGrandmother),
      maternalGrandfather: stripEmpty(v.maternalGrandfather),
      paternalGrandmother: stripEmpty(v.paternalGrandmother),
      paternalGrandfather: stripEmpty(v.paternalGrandfather),
    };

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.push("/tree");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormProvider {...methods}>
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Build your family tree
            </h1>
            <p className="text-sm text-muted">
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </p>
          </div>
          <ThemeToggle />
        </header>

        {/* Progress */}
        <div className="mb-6 flex gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col gap-1.5">
              <div
                className={`h-1.5 rounded-full ${
                  i <= step ? "bg-accent" : "bg-border"
                }`}
              />
              <span
                className={`text-xs ${
                  i <= step ? "text-foreground" : "text-muted"
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex-1">
          {step === 0 && (
            <Section title="Your details">
              <PersonFields prefix="self" idPrefix="self" />
            </Section>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <Section title="Mother">
                <PersonFields prefix="mother" idPrefix="mother" />
              </Section>
              <Section title="Father">
                <PersonFields prefix="father" idPrefix="father" />
              </Section>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted">
                Add any grandparents you know. Leave a section blank to skip it.
              </p>
              <Section title="Maternal grandmother">
                <PersonFields prefix="maternalGrandmother" idPrefix="mgm" />
              </Section>
              <Section title="Maternal grandfather">
                <PersonFields prefix="maternalGrandfather" idPrefix="mgf" />
              </Section>
              <Section title="Paternal grandmother">
                <PersonFields prefix="paternalGrandmother" idPrefix="pgm" />
              </Section>
              <Section title="Paternal grandfather">
                <PersonFields prefix="paternalGrandfather" idPrefix="pgf" />
              </Section>
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <footer className="mt-6 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={back}
            disabled={step === 0 || submitting}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={onSubmit} loading={submitting}>
              <Check className="h-4 w-4" /> Create my tree
            </Button>
          )}
        </footer>
      </div>
    </FormProvider>
  );
}
