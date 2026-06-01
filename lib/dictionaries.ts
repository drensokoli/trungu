// Plain (server- and client-safe) translation tables. `en` is the source of
// truth; `sq` is typed against it so every key must be translated.

export type Lang = "en" | "sq";
export const LANGS: Lang[] = ["en", "sq"];
export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "lang";

export const LANG_LABEL: Record<Lang, string> = {
  en: "English",
  sq: "Shqip",
};

const en = {
  // Auth
  "auth.login.title": "Welcome back",
  "auth.login.subtitle": "Log in to your family tree",
  "auth.signup.title": "Create your account",
  "auth.signup.subtitle": "Start building your family tree",
  "auth.continueGoogle": "Continue with Google",
  "auth.signupGoogle": "Sign up with Google",
  "auth.or": "or",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.fullName": "Full name",
  "auth.login.submit": "Log in",
  "auth.signup.submit": "Create account",
  "auth.noAccount": "Don't have an account?",
  "auth.haveAccount": "Already have an account?",
  "auth.toSignup": "Sign up",
  "auth.toLogin": "Log in",
  "auth.passwordHint": "At least 8 characters.",
  "auth.invalidCredentials": "Invalid email or password",
  "auth.createFailed": "Could not create account",
  "auth.createdLogIn": "Account created — please log in",

  // Toolbar
  "toolbar.toHorizontal": "Switch to horizontal layout",
  "toolbar.toVertical": "Switch to vertical layout",
  "toolbar.signOut": "Sign out",
  "lang.change": "Change language",

  // Add-relative menu
  "add.relative": "Add relative",
  "add.parent": "Add parent",
  "add.sibling": "Add sibling",
  "add.child": "Add child",
  "add.spouse": "Add spouse",

  // Person form dialog
  "form.title.parent": "Add a parent",
  "form.title.sibling": "Add a sibling",
  "form.title.child": "Add a child",
  "form.title.spouse": "Add a spouse",
  "form.title.edit": "Edit person",
  "form.desc.create": "Fill in what you know — you can edit it later.",
  "form.desc.edit": "Update this person's details.",
  "form.currentPartner": "Current partner",
  "form.otherParent": "Other parent",
  "form.otherParentHint": "Which spouse is this child's other parent?",
  "form.parentUnknown": "Unknown / single parent",
  "form.firstNameRequired": "First name is required.",
  "form.saveFailed": "Could not save",
  "form.deleteFailed": "Could not delete",
  "common.delete": "Delete",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.close": "Close",
  "common.edit": "Edit",
  "common.somethingWrong": "Something went wrong",

  // Person fields / details
  "field.firstName": "First name",
  "field.lastName": "Last name",
  "field.sex": "Sex",
  "field.birthDate": "Date of birth",
  "field.birthPlace": "Place of birth",
  "field.deceased": "Deceased",
  "field.deathDate": "Date of death",
  "field.deathPlace": "Place of death",
  "field.searchPlace": "Search a city or place",
  "sex.MALE": "Male",
  "sex.FEMALE": "Female",
  "sex.UNKNOWN": "Unknown",

  // Date picker
  "date.precision.year": "Year",
  "date.precision.month": "Month",
  "date.precision.day": "Day",
  "date.approximate": "Approximate",
  "date.approximateHint": "Around this date",
  "date.placeholder.year": "yyyy",
  "date.placeholder.month": "mm/yyyy",
  "date.placeholder.day": "dd/mm/yyyy",
  "date.clear": "Clear",

  // Person card
  "person.you": "You",
  "person.unnamed": "Unnamed",
  "person.bornYear": "b. {year}",

  // Onboarding
  "onb.title": "Build your family tree",
  "onb.step": "Step {n} of {total} — {label}",
  "onb.step.you": "You",
  "onb.step.parents": "Parents",
  "onb.step.grandparents": "Grandparents",
  "onb.yourDetails": "Your details",
  "onb.mother": "Mother",
  "onb.father": "Father",
  "onb.parentsHint":
    "Add your parents if you know them. Leave a section blank to skip it.",
  "onb.grandparentsHint":
    "Add any grandparents you know. Leave a section blank to skip it.",
  "onb.skip": "Skip",
  "onb.mgm": "Maternal grandmother",
  "onb.mgf": "Maternal grandfather",
  "onb.pgm": "Paternal grandmother",
  "onb.pgf": "Paternal grandfather",
  "onb.back": "Back",
  "onb.continue": "Continue",
  "onb.create": "Create my tree",
  "onb.err.firstName": "Please enter your first name.",
  "onb.err.mother": "Please enter your mother's first name.",
  "onb.err.father": "Please enter your father's first name.",
};

export type Dict = typeof en;
export type DictKey = keyof Dict;

const sq: Dict = {
  // Auth
  "auth.login.title": "Mirë se erdhe",
  "auth.login.subtitle": "Hyr në pemën tënde familjare",
  "auth.signup.title": "Krijo llogarinë tënde",
  "auth.signup.subtitle": "Fillo të ndërtosh pemën familjare",
  "auth.continueGoogle": "Vazhdo me Google",
  "auth.signupGoogle": "Regjistrohu me Google",
  "auth.or": "ose",
  "auth.email": "Email",
  "auth.password": "Fjalëkalimi",
  "auth.fullName": "Emri i plotë",
  "auth.login.submit": "Hyr",
  "auth.signup.submit": "Krijo llogari",
  "auth.noAccount": "Nuk ke llogari?",
  "auth.haveAccount": "Ke tashmë një llogari?",
  "auth.toSignup": "Regjistrohu",
  "auth.toLogin": "Hyr",
  "auth.passwordHint": "Të paktën 8 karaktere.",
  "auth.invalidCredentials": "Email ose fjalëkalim i pasaktë",
  "auth.createFailed": "Llogaria nuk u krijua dot",
  "auth.createdLogIn": "Llogaria u krijua — të lutem hyr",

  // Toolbar
  "toolbar.toHorizontal": "Kalo në pamje horizontale",
  "toolbar.toVertical": "Kalo në pamje vertikale",
  "toolbar.signOut": "Dil",
  "lang.change": "Ndrysho gjuhën",

  // Add-relative menu
  "add.relative": "Shto të afërm",
  "add.parent": "Shto prind",
  "add.sibling": "Shto vëlla/motër",
  "add.child": "Shto fëmijë",
  "add.spouse": "Shto bashkëshort/e",

  // Person form dialog
  "form.title.parent": "Shto një prind",
  "form.title.sibling": "Shto një vëlla/motër",
  "form.title.child": "Shto një fëmijë",
  "form.title.spouse": "Shto një bashkëshort/e",
  "form.title.edit": "Ndrysho personin",
  "form.desc.create": "Plotëso çfarë di — mund ta ndryshosh më vonë.",
  "form.desc.edit": "Përditëso të dhënat e këtij personi.",
  "form.currentPartner": "Partner aktual",
  "form.otherParent": "Prindi tjetër",
  "form.otherParentHint": "Cili bashkëshort/e është prindi tjetër i fëmijës?",
  "form.parentUnknown": "I panjohur / një prind",
  "form.firstNameRequired": "Emri është i detyrueshëm.",
  "form.saveFailed": "Nuk u ruajt dot",
  "form.deleteFailed": "Nuk u fshi dot",
  "common.delete": "Fshi",
  "common.cancel": "Anulo",
  "common.save": "Ruaj",
  "common.close": "Mbyll",
  "common.edit": "Ndrysho",
  "common.somethingWrong": "Diçka shkoi keq",

  // Person fields / details
  "field.firstName": "Emri",
  "field.lastName": "Mbiemri",
  "field.sex": "Gjinia",
  "field.birthDate": "Data e lindjes",
  "field.birthPlace": "Vendi i lindjes",
  "field.deceased": "I/E ndjerë",
  "field.deathDate": "Data e vdekjes",
  "field.deathPlace": "Vendi i vdekjes",
  "field.searchPlace": "Kërko një qytet ose vend",
  "sex.MALE": "Mashkull",
  "sex.FEMALE": "Femër",
  "sex.UNKNOWN": "E panjohur",

  // Date picker
  "date.precision.year": "Viti",
  "date.precision.month": "Muaji",
  "date.precision.day": "Dita",
  "date.approximate": "I përafërt",
  "date.approximateHint": "Rreth kësaj date",
  "date.placeholder.year": "vvvv",
  "date.placeholder.month": "mm/vvvv",
  "date.placeholder.day": "dd/mm/vvvv",
  "date.clear": "Pastro",

  // Person card
  "person.you": "Ti",
  "person.unnamed": "Pa emër",
  "person.bornYear": "l. {year}",

  // Onboarding
  "onb.title": "Ndërto pemën tënde familjare",
  "onb.step": "Hapi {n} nga {total} — {label}",
  "onb.step.you": "Ti",
  "onb.step.parents": "Prindërit",
  "onb.step.grandparents": "Gjyshërit",
  "onb.yourDetails": "Të dhënat e tua",
  "onb.mother": "Nëna",
  "onb.father": "Babai",
  "onb.parentsHint":
    "Shto prindërit nëse i njeh. Lëre bosh një seksion për ta anashkaluar.",
  "onb.grandparentsHint":
    "Shto gjyshërit që njeh. Lëre bosh një seksion për ta anashkaluar.",
  "onb.skip": "Anashkalo",
  "onb.mgm": "Gjyshja nga nëna",
  "onb.mgf": "Gjyshi nga nëna",
  "onb.pgm": "Gjyshja nga babai",
  "onb.pgf": "Gjyshi nga babai",
  "onb.back": "Mbrapa",
  "onb.continue": "Vazhdo",
  "onb.create": "Krijo pemën time",
  "onb.err.firstName": "Të lutem shkruaj emrin tënd.",
  "onb.err.mother": "Të lutem shkruaj emrin e nënës.",
  "onb.err.father": "Të lutem shkruaj emrin e babait.",
};

export const dictionaries: Record<Lang, Dict> = { en, sq };

export function normalizeLang(value: string | undefined | null): Lang {
  return value === "sq" ? "sq" : "en";
}

/** Look up a key and interpolate `{name}` placeholders. */
export function translate(
  lang: Lang,
  key: DictKey,
  params?: Record<string, string | number>,
): string {
  let text: string = dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return text;
}
