"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Crosshair,
  Languages,
  LifeBuoy,
  MapPin,
  Send,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { thaiTranslations } from "../thaiTranslations";

type Language = "en" | "my" | "th";

type DamageForm = {
  assessorName: string;
  phone: string;
  organization: string;
  observedAt: string;
  district: string;
  village: string;
  locationDetails: string;
  latitude: string;
  longitude: string;
  severity: "minor" | "moderate" | "major" | "destroyed";
  accessStatus: "safe" | "limited" | "unsafe" | "inaccessible";
  waterPresent: boolean;
  floodDepthCm: string;
  householdsAffected: string;
  peopleAffected: string;
  peopleDisplaced: string;
  peopleInjured: string;
  structuresDamaged: string;
  structuresDestroyed: string;
  categories: string[];
  hazards: string[];
  evidenceUrl: string;
  description: string;
  consent: boolean;
  website: string;
};

function currentLocalTime() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function createInitialForm(): DamageForm {
  return {
    assessorName: "",
    phone: "",
    organization: "",
    observedAt: currentLocalTime(),
    district: "",
    village: "",
    locationDetails: "",
    latitude: "",
    longitude: "",
    severity: "moderate",
    accessStatus: "limited",
    waterPresent: true,
    floodDepthCm: "0",
    householdsAffected: "0",
    peopleAffected: "0",
    peopleDisplaced: "0",
    peopleInjured: "0",
    structuresDamaged: "0",
    structuresDestroyed: "0",
    categories: [],
    hazards: [],
    evidenceUrl: "",
    description: "",
    consent: false,
    website: "",
  };
}

const my: Record<string, string> = {
  "Back to dashboard": "ဒက်ရှ်ဘုတ်သို့ ပြန်ရန်",
  "Language": "ဘာသာစကား",
  "Request help": "အကူအညီတောင်းရန်",
  "Damage assessment": "ပျက်စီးဆုံးရှုံးမှု စိစစ်ချက်",
  "FIVE WESTERN TAK DISTRICTS": "တာ့ခ်အနောက်ပိုင်း ခရိုင် ၅ ခု",
  "Report flood damage": "ရေဘေးပျက်စီးမှု သတင်းပို့ရန်",
  "Record observed impacts to homes, infrastructure, services, livelihoods, and access routes.": "နေအိမ်၊ အခြေခံအဆောက်အအုံ၊ ဝန်ဆောင်မှု၊ အသက်မွေးဝမ်းကျောင်းနှင့် ဝင်ရောက်လမ်းများတွင် တွေ့ရှိသော ထိခိုက်မှုကို မှတ်တမ်းတင်ပါ။",
  "This assessment does not request emergency assistance": "ဤစိစစ်ချက်သည် အရေးပေါ်အကူအညီ တောင်းခံခြင်း မဟုတ်ပါ",
  "Use Request Help for people needing rescue, medical care, food, shelter, or transport.": "ကယ်ဆယ်ရေး၊ ဆေးကုသမှု၊ အစားအစာ၊ ခိုလှုံရာ သို့မဟုတ် သယ်ယူပို့ဆောင်ရေးလိုသူများအတွက် အကူအညီတောင်းခံချက်ကို အသုံးပြုပါ။",
  "Open Request Help": "အကူအညီတောင်းခံချက် ဖွင့်ရန်",
  "Assessor details": "စိစစ်သူ အချက်အလက်",
  "Required fields are marked": "မဖြစ်မနေ ဖြည့်ရမည့်အကွက်များကို မှတ်သားထားသည်",
  "Assessor name": "စိစစ်သူအမည်",
  "Phone number": "ဖုန်းနံပါတ်",
  "Organization or team": "အဖွဲ့အစည်း သို့မဟုတ် အဖွဲ့",
  "Observation date and time": "တွေ့ရှိသည့် နေ့ရက်နှင့်အချိန်",
  "Location": "တည်နေရာ",
  "Only the five target districts can be submitted": "ပစ်မှတ်ခရိုင် ၅ ခုအတွက်သာ တင်ပြနိုင်သည်",
  "District": "ခရိုင်",
  "Select district": "ခရိုင်ရွေးပါ",
  "Village or ward": "ကျေးရွာ သို့မဟုတ် ရပ်ကွက်",
  "Address, landmark, or affected route": "လိပ်စာ၊ အမှတ်အသား သို့မဟုတ် ထိခိုက်သောလမ်း",
  "Use my location": "ကျွန်ုပ်၏တည်နေရာ သုံးရန်",
  "Getting location": "တည်နေရာ ရယူနေသည်",
  "Location captured": "တည်နေရာ ရရှိပြီး",
  "Location permission was unavailable. Enter a landmark instead.": "တည်နေရာခွင့်ပြုချက် မရရှိပါ။ အနီးရှိ အမှတ်အသားကို ဖြည့်ပါ။",
  "Severity and access": "ပျက်စီးမှုနှင့် ဝင်ရောက်နိုင်မှု",
  "Use the best current field estimate": "လက်ရှိအကောင်းဆုံး ကွင်းဆင်းခန့်မှန်းချက်ကို အသုံးပြုပါ",
  "Minor": "အနည်းငယ်",
  "Usable with small repairs": "ပြုပြင်မှုအနည်းငယ်ဖြင့် အသုံးပြုနိုင်",
  "Moderate": "အလယ်အလတ်",
  "Partly usable; repairs required": "တစ်စိတ်တစ်ပိုင်း အသုံးပြုနိုင်၊ ပြုပြင်ရန်လို",
  "Major": "ကြီးမား",
  "Unsafe or services seriously disrupted": "မလုံခြုံ သို့မဟုတ် ဝန်ဆောင်မှု ပြင်းထန်စွာပြတ်တောက်",
  "Destroyed / unusable": "ပျက်စီး / အသုံးမပြုနိုင်",
  "Total loss or cannot be occupied": "လုံးဝပျက်စီး သို့မဟုတ် နေထိုင်မရ",
  "Access status": "ဝင်ရောက်နိုင်မှု",
  "Safe access": "လုံခြုံစွာ ဝင်နိုင်",
  "Limited access": "အကန့်အသတ်ဖြင့် ဝင်နိုင်",
  "Unsafe access": "မလုံခြုံသော ဝင်ရောက်မှု",
  "Inaccessible": "ဝင်ရောက်မရ",
  "Floodwater is still present": "ရေကြီးရေ ရှိနေသေးသည်",
  "Estimated water depth (cm)": "ခန့်မှန်းရေအနက် (စင်တီမီတာ)",
  "Impact estimates": "ထိခိုက်မှု ခန့်မှန်းချက်",
  "Enter zero when none are known": "မရှိကြောင်းသိပါက သုညဖြည့်ပါ",
  "Households affected": "ထိခိုက်သော အိမ်ထောင်စု",
  "People affected": "ထိခိုက်သော လူဦးရေ",
  "People displaced": "ရွှေ့ပြောင်းရသူ",
  "People injured": "ဒဏ်ရာရသူ",
  "Structures damaged": "ပျက်စီးသော အဆောက်အအုံ",
  "Structures destroyed": "လုံးဝပျက်စီးသော အဆောက်အအုံ",
  "Damage categories": "ပျက်စီးမှု အမျိုးအစား",
  "Select all observed categories": "တွေ့ရှိသမျှ အမျိုးအစား ရွေးပါ",
  "Homes and buildings": "နေအိမ်နှင့် အဆောက်အအုံ",
  "Roads and bridges": "လမ်းနှင့် တံတား",
  "Agriculture and livestock": "စိုက်ပျိုးရေးနှင့် မွေးမြူရေး",
  "Water and sanitation": "ရေနှင့် သန့်ရှင်းရေး",
  "Power and communications": "လျှပ်စစ်နှင့် ဆက်သွယ်ရေး",
  "School or health facility": "ကျောင်း သို့မဟုတ် ကျန်းမာရေးဌာန",
  "Business or market": "စီးပွားရေး သို့မဟုတ် ဈေး",
  "Other": "အခြား",
  "Immediate hazards": "ချက်ချင်းအန္တရာယ်များ",
  "Fast-moving water": "စီးဆင်းမြန်သောရေ",
  "Structural collapse": "အဆောက်အအုံ ပြိုကျမှု",
  "Landslide": "မြေပြိုမှု",
  "Electrical hazard": "လျှပ်စစ်အန္တရာယ်",
  "Contaminated water": "ညစ်ညမ်းရေ",
  "Debris obstruction": "အပျက်အစီး ပိတ်ဆို့မှု",
  "No known immediate hazard": "သိရှိထားသော ချက်ချင်းအန္တရာယ်မရှိ",
  "Evidence and description": "အထောက်အထားနှင့် ဖော်ပြချက်",
  "Describe what was observed, which services are disrupted, and how estimates were obtained.": "တွေ့ရှိချက်၊ ပြတ်တောက်သောဝန်ဆောင်မှုနှင့် ခန့်မှန်းချက်ရယူပုံကို ဖော်ပြပါ။",
  "Evidence link": "အထောက်အထား လင့်ခ်",
  "Optional link to photos or documents": "ဓာတ်ပုံ သို့မဟုတ် စာရွက်စာတမ်း လင့်ခ် (မဖြစ်မနေမဟုတ်)",
  "I confirm this is the best available field estimate and may be shared with responsible response partners.": "ဤအချက်အလက်သည် လက်ရှိရရှိနိုင်သော အကောင်းဆုံးကွင်းဆင်းခန့်မှန်းချက်ဖြစ်ပြီး သက်ဆိုင်ရာ တုံ့ပြန်ရေးအဖွဲ့များနှင့် မျှဝေနိုင်ကြောင်း အတည်ပြုပါသည်။",
  "Submit damage assessment": "ပျက်စီးမှုစိစစ်ချက် ပို့ရန်",
  "Submitting": "ပို့နေသည်",
  "Please select at least one damage category.": "ပျက်စီးမှုအမျိုးအစား အနည်းဆုံးတစ်ခု ရွေးပါ။",
  "The assessment could not be submitted. Please try again.": "စိစစ်ချက်ကို မပို့နိုင်ပါ။ ထပ်မံကြိုးစားပါ။",
  "Assessment recorded": "စိစစ်ချက် မှတ်တမ်းတင်ပြီး",
  "Keep this assessment reference": "ဤစိစစ်ချက် ရည်ညွှန်းနံပါတ်ကို သိမ်းထားပါ",
  "The assessment has been stored for review. Counts remain field estimates until verified by responsible authorities.": "စိစစ်ရန် အချက်အလက်ကို သိမ်းဆည်းပြီးဖြစ်သည်။ သက်ဆိုင်ရာ အာဏာပိုင်များ အတည်ပြုမချင်း ကွင်းဆင်းခန့်မှန်းချက်အဖြစ်သာ သတ်မှတ်ပါသည်။",
  "Submit another assessment": "နောက်ထပ် စိစစ်ချက်ပို့ရန်",
  "Go to dashboard": "ဒက်ရှ်ဘုတ်သို့ သွားရန်",
  "Assessment guidance": "စိစစ်မှု လမ်းညွှန်",
  "Do not enter a flooded or unstable structure to complete this form.": "ဤဖောင်ဖြည့်ရန် ရေဝင်နေသော သို့မဟုတ် မတည်ငြိမ်သော အဆောက်အအုံထဲ မဝင်ပါနှင့်။",
  "Separate observed facts from estimates in the description.": "ဖော်ပြချက်တွင် တွေ့ရှိချက်နှင့် ခန့်မှန်းချက်ကို ခွဲရေးပါ။",
  "Submit a new assessment when conditions materially change.": "အခြေအနေ သိသာစွာပြောင်းလဲပါက စိစစ်ချက်အသစ် ပို့ပါ။",
  "Data handling": "ဒေတာ အသုံးပြုမှု",
  "Contact and location details are stored privately for assessment coordination. Do not include identity documents, bank details, or passwords.": "ဆက်သွယ်ရန်နှင့် တည်နေရာအချက်အလက်များကို စိစစ်ညှိနှိုင်းမှုအတွက် သီးသန့်သိမ်းဆည်းသည်။ မှတ်ပုံတင်၊ ဘဏ်အချက်အလက် သို့မဟုတ် စကားဝှက် မထည့်ပါနှင့်။",
};

const districts = [
  { en: "Mae Sot", my: "မဲဆောက်", th: "แม่สอด" },
  { en: "Umphang", my: "အုမ်းဖန်", th: "อุ้มผาง" },
  { en: "Tha Song Yang", my: "ထာဆောင်ယန်း", th: "ท่าสองยาง" },
  { en: "Mae Ramat", my: "မယ်ရမတ်", th: "แม่ระมาด" },
  { en: "Phop Phra", my: "ဖုပ်ဖရာ", th: "พบพระ" },
];

const categories = [
  ["homes", "Homes and buildings"], ["roads", "Roads and bridges"],
  ["agriculture", "Agriculture and livestock"], ["water-sanitation", "Water and sanitation"],
  ["power-communications", "Power and communications"], ["school-clinic", "School or health facility"],
  ["business", "Business or market"], ["other", "Other"],
] as const;

const hazards = [
  ["fast-water", "Fast-moving water"], ["collapse", "Structural collapse"],
  ["landslide", "Landslide"], ["electrical", "Electrical hazard"],
  ["contamination", "Contaminated water"], ["debris", "Debris obstruction"],
  ["none-known", "No known immediate hazard"],
] as const;

export default function DamageAssessmentPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [form, setForm] = useState<DamageForm>(createInitialForm);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const tr = (value: string) => language === "my" ? my[value] ?? value : language === "th" ? thaiTranslations[value] ?? value : value;

  useEffect(() => {
    const saved = window.localStorage.getItem("floodwatch-language");
    if (saved === "en" || saved === "my" || saved === "th") setLanguage(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("floodwatch-language", language);
  }, [language]);

  const update = <K extends keyof DamageForm>(key: K, value: DamageForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggleList = (key: "categories" | "hazards", value: string) => {
    if (key === "hazards" && value === "none-known") {
      update("hazards", form.hazards.includes(value) ? [] : [value]);
      return;
    }
    const current = key === "hazards" ? form.hazards.filter((item) => item !== "none-known") : form.categories;
    update(key, current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage(tr("Location permission was unavailable. Enter a landmark instead."));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => {
      update("latitude", position.coords.latitude.toFixed(6));
      update("longitude", position.coords.longitude.toFixed(6));
      setLocationMessage(tr("Location captured"));
      setLocating(false);
    }, () => {
      setLocationMessage(tr("Location permission was unavailable. Enter a landmark instead."));
      setLocating(false);
    }, { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (form.categories.length === 0) {
      setError(tr("Please select at least one damage category."));
      return;
    }
    setSubmitting(true);
    try {
      const numericFields = ["floodDepthCm", "householdsAffected", "peopleAffected", "peopleDisplaced", "peopleInjured", "structuresDamaged", "structuresDestroyed"] as const;
      const payload: Record<string, unknown> = { ...form };
      numericFields.forEach((field) => { payload[field] = Number(form[field]); });
      const response = await fetch("/api/damage-assessments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { reference?: string; error?: string };
      if (!response.ok || !result.reference) throw new Error(result.error);
      setReference(result.reference);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(tr("The assessment could not be submitted. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => { setForm(createInitialForm()); setReference(""); setError(""); setLocationMessage(""); };

  return (
    <main className="help-page damage-page">
      <header className="topbar help-topbar">
        <a className="brand" href="/" aria-label={`Help Without Frontiers - ${tr("Back to dashboard")}`}><img className="brand-logo" src="/hwf-site-logo.png" alt="Help Without Frontiers" /><span>FLOODWATCH</span></a>
        <a className="help-back-link" href="/"><ArrowLeft size={16} /> {tr("Back to dashboard")}</a>
        <div className="language-switch" role="group" aria-label={tr("Language")}><Languages size={15} /><button type="button" aria-pressed={language === "en"} className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>EN</button><button type="button" aria-pressed={language === "my"} className={language === "my" ? "active" : ""} onClick={() => setLanguage("my")}>မြန်မာ</button><button type="button" aria-pressed={language === "th"} className={language === "th" ? "active" : ""} onClick={() => setLanguage("th")}>ไทย</button></div>
      </header>

      <div className="help-content">
        <nav className="report-switch" aria-label="Reporting forms"><a href="/request-help"><LifeBuoy size={16} /> {tr("Request help")}</a><a className="active" href="/damage-assessment"><ClipboardCheck size={16} /> {tr("Damage assessment")}</a></nav>
        {reference ? (
          <section className="request-success" aria-live="polite"><span className="success-mark"><CheckCircle2 size={34} /></span><p className="eyebrow">{tr("Assessment recorded")}</p><h1>{tr("Keep this assessment reference")}</h1><strong className="reference-number">{reference}</strong><p>{tr("The assessment has been stored for review. Counts remain field estimates until verified by responsible authorities.")}</p><div className="success-actions"><button type="button" onClick={reset}>{tr("Submit another assessment")}</button><a href="/">{tr("Go to dashboard")}</a></div></section>
        ) : (
          <>
            <section className="help-intro"><p className="eyebrow">{tr("FIVE WESTERN TAK DISTRICTS")}</p><h1>{tr("Report flood damage")}</h1><p>{tr("Record observed impacts to homes, infrastructure, services, livelihoods, and access routes.")}</p></section>
            <section className="assessment-notice"><TriangleAlert size={21} /><div><strong>{tr("This assessment does not request emergency assistance")}</strong><p>{tr("Use Request Help for people needing rescue, medical care, food, shelter, or transport.")}</p></div><a href="/request-help">{tr("Open Request Help")} <LifeBuoy size={16} /></a></section>
            <div className="help-layout">
              <form className="help-form" onSubmit={submit}>
                <fieldset className="form-section"><legend><span>01</span><b>{tr("Assessor details")}</b><small>* {tr("Required fields are marked")}</small></legend><div className="form-grid two-column"><label><span>{tr("Assessor name")} *</span><input required maxLength={120} autoComplete="name" value={form.assessorName} onChange={(event) => update("assessorName", event.target.value)} /></label><label><span>{tr("Phone number")} *</span><input required maxLength={32} inputMode="tel" autoComplete="tel" placeholder="09x xxx xxxx" value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label><label><span>{tr("Organization or team")}</span><input maxLength={160} value={form.organization} onChange={(event) => update("organization", event.target.value)} /></label><label><span>{tr("Observation date and time")} *</span><input required type="datetime-local" value={form.observedAt} onChange={(event) => update("observedAt", event.target.value)} /></label></div></fieldset>

                <fieldset className="form-section"><legend><span>02</span><b>{tr("Location")}</b><small>{tr("Only the five target districts can be submitted")}</small></legend><div className="form-grid two-column"><label><span>{tr("District")} *</span><select required value={form.district} onChange={(event) => update("district", event.target.value)}><option value="">{tr("Select district")}</option>{districts.map((district) => <option key={district.en} value={district.en}>{language === "my" ? district.my : language === "th" ? district.th : district.en}</option>)}</select></label><label><span>{tr("Village or ward")} *</span><input required maxLength={120} value={form.village} onChange={(event) => update("village", event.target.value)} /></label><label className="full-width"><span>{tr("Address, landmark, or affected route")} *</span><textarea required maxLength={500} rows={3} value={form.locationDetails} onChange={(event) => update("locationDetails", event.target.value)} /></label></div><div className="location-capture"><button type="button" onClick={getLocation} disabled={locating}><Crosshair size={16} /> {tr(locating ? "Getting location" : "Use my location")}</button>{form.latitude && form.longitude && <span><MapPin size={14} /> {form.latitude}, {form.longitude}</span>}{locationMessage && <small>{locationMessage}</small>}</div></fieldset>

                <fieldset className="form-section"><legend><span>03</span><b>{tr("Severity and access")}</b><small>{tr("Use the best current field estimate")}</small></legend><div className="damage-severity-options">{([ ["minor", "Minor", "Usable with small repairs"], ["moderate", "Moderate", "Partly usable; repairs required"], ["major", "Major", "Unsafe or services seriously disrupted"], ["destroyed", "Destroyed / unusable", "Total loss or cannot be occupied"] ] as const).map(([value, title, description]) => <label className={form.severity === value ? `selected ${value}` : ""} key={value}><input type="radio" name="severity" value={value} checked={form.severity === value} onChange={() => update("severity", value)} /><span><b>{tr(title)}</b><small>{tr(description)}</small></span></label>)}</div><div className="form-grid two-column damage-access-grid"><label><span>{tr("Access status")} *</span><select value={form.accessStatus} onChange={(event) => update("accessStatus", event.target.value as DamageForm["accessStatus"])}>{[["safe","Safe access"],["limited","Limited access"],["unsafe","Unsafe access"],["inaccessible","Inaccessible"]].map(([value,label]) => <option value={value} key={value}>{tr(label)}</option>)}</select></label><label><span>{tr("Estimated water depth (cm)")}</span><input type="number" min="0" max="2000" value={form.floodDepthCm} onChange={(event) => update("floodDepthCm", event.target.value)} /></label></div><label className="check-row"><input type="checkbox" checked={form.waterPresent} onChange={(event) => update("waterPresent", event.target.checked)} /><span>{tr("Floodwater is still present")}</span></label></fieldset>

                <fieldset className="form-section"><legend><span>04</span><b>{tr("Impact estimates")}</b><small>{tr("Enter zero when none are known")}</small></legend><div className="form-grid three-column">{([ ["householdsAffected","Households affected"], ["peopleAffected","People affected"], ["peopleDisplaced","People displaced"], ["peopleInjured","People injured"], ["structuresDamaged","Structures damaged"], ["structuresDestroyed","Structures destroyed"] ] as const).map(([key,label]) => <label key={key}><span>{tr(label)}</span><input type="number" min="0" max="500000" value={form[key]} onChange={(event) => update(key, event.target.value)} /></label>)}</div></fieldset>

                <fieldset className="form-section"><legend><span>05</span><b>{tr("Damage categories")}</b><small>{tr("Select all observed categories")}</small></legend><div className="need-options">{categories.map(([value,label]) => <label className={form.categories.includes(value) ? "selected" : ""} key={value}><input type="checkbox" checked={form.categories.includes(value)} onChange={() => toggleList("categories", value)} /><span>{tr(label)}</span></label>)}</div><h3 className="subfield-heading">{tr("Immediate hazards")}</h3><div className="need-options hazard-options">{hazards.map(([value,label]) => <label className={form.hazards.includes(value) ? "selected" : ""} key={value}><input type="checkbox" checked={form.hazards.includes(value)} onChange={() => toggleList("hazards", value)} /><span>{tr(label)}</span></label>)}</div></fieldset>

                <fieldset className="form-section"><legend><span>06</span><b>{tr("Evidence and description")}</b><small>{tr("Use the best current field estimate")}</small></legend><label className="details-field"><span>{tr("Describe what was observed, which services are disrupted, and how estimates were obtained.")} *</span><textarea required maxLength={2000} rows={7} value={form.description} onChange={(event) => update("description", event.target.value)} /></label><label className="details-field evidence-field"><span>{tr("Evidence link")}</span><input type="url" maxLength={500} placeholder={tr("Optional link to photos or documents")} value={form.evidenceUrl} onChange={(event) => update("evidenceUrl", event.target.value)} /></label></fieldset>

                <div className="honeypot" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)} /></label></div><label className="consent-row"><input required type="checkbox" checked={form.consent} onChange={(event) => update("consent", event.target.checked)} /><span>{tr("I confirm this is the best available field estimate and may be shared with responsible response partners.")}</span></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="submit-request damage-submit" type="submit" disabled={submitting}><Send size={18} /> {tr(submitting ? "Submitting" : "Submit damage assessment")}</button>
              </form>

              <aside className="help-sidebar"><section><ClipboardCheck size={21} /><h2>{tr("Assessment guidance")}</h2><ul><li>{tr("Do not enter a flooded or unstable structure to complete this form.")}</li><li>{tr("Separate observed facts from estimates in the description.")}</li><li>{tr("Submit a new assessment when conditions materially change.")}</li></ul></section><section><ShieldAlert size={21} /><h2>{tr("Data handling")}</h2><p>{tr("Contact and location details are stored privately for assessment coordination. Do not include identity documents, bank details, or passwords.")}</p></section></aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
