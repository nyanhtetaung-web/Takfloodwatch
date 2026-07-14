"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Crosshair,
  HeartHandshake,
  Languages,
  LifeBuoy,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  TriangleAlert,
  Users,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { thaiTranslations } from "../thaiTranslations";

type Language = "en" | "my" | "th";

type HelpForm = {
  fullName: string;
  phone: string;
  alternateContact: string;
  preferredLanguage: string;
  district: string;
  village: string;
  locationDetails: string;
  latitude: string;
  longitude: string;
  peopleCount: string;
  childrenUnderFive: string;
  olderAdults: string;
  disabilityOrMobilityNeeds: boolean;
  urgency: "critical" | "urgent" | "routine";
  needs: string[];
  details: string;
  consent: boolean;
  website: string;
};

const initialForm: HelpForm = {
  fullName: "",
  phone: "",
  alternateContact: "",
  preferredLanguage: "English",
  district: "",
  village: "",
  locationDetails: "",
  latitude: "",
  longitude: "",
  peopleCount: "1",
  childrenUnderFive: "0",
  olderAdults: "0",
  disabilityOrMobilityNeeds: false,
  urgency: "urgent",
  needs: [],
  details: "",
  consent: false,
  website: "",
};

const my: Record<string, string> = {
  "Back to dashboard": "ဒက်ရှ်ဘုတ်သို့ ပြန်ရန်",
  "Language": "ဘာသာစကား",
  "FIVE WESTERN TAK DISTRICTS": "တာ့ခ်အနောက်ပိုင်း ခရိုင် ၅ ခု",
  "Request flood assistance": "ရေဘေးအကူအညီ တောင်းခံရန်",
  "Send a clear report to Help Without Frontiers. Provide a reachable phone number and the safest available location details.": "Help Without Frontiers သို့ ရှင်းလင်းသော အကူအညီတောင်းခံချက် ပို့ပါ။ ဆက်သွယ်နိုင်သော ဖုန်းနံပါတ်နှင့် ရရှိနိုင်သမျှ အတိအကျနေရာအချက်အလက်ကို ဖြည့်ပါ။",
  "This form is not emergency dispatch": "ဤဖောင်သည် အရေးပေါ်ကယ်ဆယ်ရေး စေလွှတ်မှု မဟုတ်ပါ",
  "For immediate danger, trapped persons, or a medical emergency, call an official hotline now.": "ချက်ချင်းအန္တရာယ်၊ ပိတ်မိနေသူ သို့မဟုတ် ဆေးဘက်အရေးပေါ်အတွက် တရားဝင် အရေးပေါ်ဖုန်းကို ယခုခေါ်ပါ။",
  "Disaster hotline": "ဘေးအန္တရာယ် အရေးပေါ်ဖုန်း",
  "Medical emergency": "ဆေးဘက် အရေးပေါ်",
  "Reporter and contact": "သတင်းပို့သူနှင့် ဆက်သွယ်ရန်",
  "Required fields are marked": "မဖြစ်မနေ ဖြည့်ရမည့်အကွက်များကို မှတ်သားထားသည်",
  "Full name": "အမည်အပြည့်အစုံ",
  "Phone number": "ဖုန်းနံပါတ်",
  "Alternate contact": "အခြားဆက်သွယ်ရန်",
  "Preferred spoken language": "ပြောဆိုလိုသော ဘာသာစကား",
  "English": "အင်္ဂလိပ်",
  "Burmese": "မြန်မာ",
  "Thai": "ထိုင်း",
  "Karen": "ကရင်",
  "Other": "အခြား",
  "Location": "တည်နေရာ",
  "Only the five target districts can be submitted": "ပစ်မှတ်ခရိုင် ၅ ခုအတွက်သာ တင်ပြနိုင်သည်",
  "District": "ခရိုင်",
  "Select district": "ခရိုင်ရွေးပါ",
  "Village or ward": "ကျေးရွာ သို့မဟုတ် ရပ်ကွက်",
  "Address, landmark, or access route": "လိပ်စာ၊ အမှတ်အသား သို့မဟုတ် ဝင်ရောက်နိုင်သည့်လမ်း",
  "Use my location": "ကျွန်ုပ်၏တည်နေရာ သုံးရန်",
  "Getting location": "တည်နေရာ ရယူနေသည်",
  "Location captured": "တည်နေရာ ရရှိပြီး",
  "Location permission was unavailable. Enter a landmark instead.": "တည်နေရာခွင့်ပြုချက် မရရှိပါ။ အနီးရှိ အမှတ်အသားကို ဖြည့်ပါ။",
  "People needing assistance": "အကူအညီလိုအပ်သူများ",
  "Include everyone at this location": "ဤနေရာရှိ လူအားလုံးကို ထည့်တွက်ပါ",
  "Total people": "စုစုပေါင်း လူဦးရေ",
  "Children under 5": "အသက် ၅ နှစ်အောက် ကလေး",
  "Adults 60 or older": "အသက် ၆၀ နှစ်နှင့်အထက်",
  "Someone has disability or mobility needs": "မသန်စွမ်းမှု သို့မဟုတ် သွားလာရေးအကူအညီလိုသူ ရှိသည်",
  "Urgency": "အရေးပေါ်အဆင့်",
  "Choose the closest description": "အနီးစပ်ဆုံး အခြေအနေကို ရွေးပါ",
  "Critical": "အလွန်အရေးပေါ်",
  "Trapped, injured, or in immediate danger": "ပိတ်မိ၊ ဒဏ်ရာရ သို့မဟုတ် ချက်ချင်းအန္တရာယ်ရှိ",
  "Urgent": "အရေးပေါ်",
  "Help needed within several hours": "နာရီအနည်းငယ်အတွင်း အကူအညီလို",
  "Routine": "ပုံမှန်",
  "Stable now, but assistance is needed": "လက်ရှိတည်ငြိမ်သော်လည်း အကူအညီလို",
  "Assistance needed": "လိုအပ်သော အကူအညီ",
  "Select all that apply": "သက်ဆိုင်သမျှ ရွေးပါ",
  "Rescue or evacuation": "ကယ်ဆယ်ရေး သို့မဟုတ် ရွှေ့ပြောင်းရေး",
  "Medical support": "ဆေးဘက်အကူအညီ",
  "Food and drinking water": "အစားအစာနှင့် သောက်သုံးရေ",
  "Temporary shelter": "ယာယီခိုလှုံရာ",
  "Transport": "သယ်ယူပို့ဆောင်ရေး",
  "Accessibility support": "မသန်စွမ်းသူ အကူအညီ",
  "Information or welfare check": "သတင်းအချက်အလက် သို့မဟုတ် အခြေအနေစစ်ဆေးမှု",
  "Situation details": "အခြေအနေ အသေးစိတ်",
  "Describe water depth, injuries, isolation, road access, and immediate risks.": "ရေအနက်၊ ဒဏ်ရာ၊ အဆက်အသွယ်ပြတ်တောက်မှု၊ လမ်းဝင်ရောက်နိုင်မှုနှင့် ချက်ချင်းအန္တရာယ်များကို ဖော်ပြပါ။",
  "I agree that this information may be used to coordinate assistance and shared with responsible response partners.": "အကူအညီညှိနှိုင်းရန်နှင့် သက်ဆိုင်ရာ တုံ့ပြန်ရေးအဖွဲ့များနှင့် မျှဝေရန် ဤအချက်အလက်ကို အသုံးပြုနိုင်ကြောင်း သဘောတူပါသည်။",
  "Submit help request": "အကူအညီတောင်းခံချက် ပို့ရန်",
  "Submitting": "ပို့နေသည်",
  "Please select at least one assistance type.": "အကူအညီအမျိုးအစား အနည်းဆုံးတစ်ခု ရွေးပါ။",
  "The report could not be submitted. Please try again or call an emergency hotline.": "တောင်းခံချက်ကို မပို့နိုင်ပါ။ ထပ်မံကြိုးစားပါ သို့မဟုတ် အရေးပေါ်ဖုန်း ခေါ်ပါ။",
  "Request recorded": "တောင်းခံချက် မှတ်တမ်းတင်ပြီး",
  "Keep this reference number": "ဤရည်ညွှန်းနံပါတ်ကို သိမ်းထားပါ",
  "Your report has been stored for assistance coordination. This confirmation does not mean a response team has been dispatched.": "အကူအညီညှိနှိုင်းရန် သင့်တောင်းခံချက်ကို သိမ်းဆည်းပြီးဖြစ်သည်။ ဤအတည်ပြုချက်သည် တုံ့ပြန်ရေးအဖွဲ့ စေလွှတ်ပြီးကြောင်း မဆိုလိုပါ။",
  "Submit another request": "နောက်ထပ် တောင်းခံချက်ပို့ရန်",
  "Go to dashboard": "ဒက်ရှ်ဘုတ်သို့ သွားရန်",
  "Before submitting": "မပို့မီ",
  "Move to higher ground when it is safe to do so.": "အန္တရာယ်ကင်းလျှင် မြင့်သောနေရာသို့ ရွှေ့ပါ။",
  "Do not cross moving floodwater or closed roads.": "စီးဆင်းနေသော ရေကြီးရေ သို့မဟုတ် ပိတ်ထားသောလမ်းကို မဖြတ်ပါနှင့်။",
  "Keep your phone charged and answer unknown calls after submitting.": "ဖုန်းအားသွင်းထားပြီး တောင်းခံချက်ပို့ပြီးနောက် မသိသောဖုန်းခေါ်ဆိုမှုများကို ဖြေပါ။",
  "Information handling": "အချက်အလက် အသုံးပြုမှု",
  "Contact and location details are stored privately for response coordination. Do not include identity documents, bank details, or passwords.": "ဆက်သွယ်ရန်နှင့် တည်နေရာအချက်အလက်များကို တုံ့ပြန်ရေးညှိနှိုင်းမှုအတွက် သီးသန့်သိမ်းဆည်းသည်။ မှတ်ပုံတင်၊ ဘဏ်အချက်အလက် သို့မဟုတ် စကားဝှက် မထည့်ပါနှင့်။",
  "Request help": "အကူအညီတောင်းရန်",
  "Damage assessment": "ပျက်စီးဆုံးရှုံးမှု စိစစ်ချက်",
};

const districts = [
  { en: "Mae Sot", my: "မဲဆောက်", th: "แม่สอด" },
  { en: "Umphang", my: "အုမ်းဖန်", th: "อุ้มผาง" },
  { en: "Tha Song Yang", my: "ထာဆောင်ယန်း", th: "ท่าสองยาง" },
  { en: "Mae Ramat", my: "မယ်ရမတ်", th: "แม่ระมาด" },
  { en: "Phop Phra", my: "ဖုပ်ဖရာ", th: "พบพระ" },
];

const needOptions = [
  ["rescue", "Rescue or evacuation"],
  ["medical", "Medical support"],
  ["food-water", "Food and drinking water"],
  ["shelter", "Temporary shelter"],
  ["transport", "Transport"],
  ["accessibility", "Accessibility support"],
  ["information", "Information or welfare check"],
  ["other", "Other"],
] as const;

export default function RequestHelpPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [form, setForm] = useState<HelpForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const tr = (value: string) => language === "my" ? my[value] ?? value : language === "th" ? thaiTranslations[value] ?? value : value;

  useEffect(() => {
    const saved = window.localStorage.getItem("floodwatch-language");
    if (saved === "en" || saved === "my" || saved === "th") {
      setLanguage(saved);
      setForm((current) => ({ ...current, preferredLanguage: saved === "my" ? "Burmese" : saved === "th" ? "Thai" : "English" }));
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("floodwatch-language", language);
  }, [language]);

  const update = <K extends keyof HelpForm>(key: K, value: HelpForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const toggleNeed = (need: string) => {
    update("needs", form.needs.includes(need) ? form.needs.filter((item) => item !== need) : [...form.needs, need]);
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage(tr("Location permission was unavailable. Enter a landmark instead."));
      return;
    }
    setLocating(true);
    setLocationMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        update("latitude", position.coords.latitude.toFixed(6));
        update("longitude", position.coords.longitude.toFixed(6));
        setLocationMessage(tr("Location captured"));
        setLocating(false);
      },
      () => {
        setLocationMessage(tr("Location permission was unavailable. Enter a landmark instead."));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (form.needs.length === 0) {
      setError(tr("Please select at least one assistance type."));
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/help-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          peopleCount: Number(form.peopleCount),
          childrenUnderFive: Number(form.childrenUnderFive),
          olderAdults: Number(form.olderAdults),
        }),
      });
      const result = await response.json() as { reference?: string; error?: string };
      if (!response.ok || !result.reference) throw new Error(result.error);
      setReference(result.reference);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(tr("The report could not be submitted. Please try again or call an emergency hotline."));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setForm({ ...initialForm, preferredLanguage: language === "my" ? "Burmese" : language === "th" ? "Thai" : "English" });
    setReference("");
    setError("");
    setLocationMessage("");
  };

  return (
    <main className="help-page">
      <header className="topbar help-topbar">
        <a className="brand" href="/" aria-label={`Help Without Frontiers - ${tr("Back to dashboard")}`}>
          <img className="brand-logo" src="/hwf-site-logo.png" alt="Help Without Frontiers" />
          <span>FLOODWATCH</span>
        </a>
        <a className="help-back-link" href="/"><ArrowLeft size={16} /> {tr("Back to dashboard")}</a>
        <div className="language-switch" role="group" aria-label={tr("Language")}>
          <Languages size={15} />
          <button type="button" aria-pressed={language === "en"} className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>EN</button>
          <button type="button" aria-pressed={language === "my"} className={language === "my" ? "active" : ""} onClick={() => setLanguage("my")}>မြန်မာ</button>
          <button type="button" aria-pressed={language === "th"} className={language === "th" ? "active" : ""} onClick={() => setLanguage("th")}>ไทย</button>
        </div>
      </header>

      <div className="help-content">
        <nav className="report-switch" aria-label="Reporting forms"><a className="active" href="/request-help"><LifeBuoy size={16} /> {tr("Request help")}</a><a href="/damage-assessment"><ClipboardCheck size={16} /> {tr("Damage assessment")}</a></nav>
        {reference ? (
          <section className="request-success" aria-live="polite">
            <span className="success-mark"><CheckCircle2 size={34} /></span>
            <p className="eyebrow">{tr("Request recorded")}</p>
            <h1>{tr("Keep this reference number")}</h1>
            <strong className="reference-number">{reference}</strong>
            <p>{tr("Your report has been stored for assistance coordination. This confirmation does not mean a response team has been dispatched.")}</p>
            <div className="success-actions">
              <button type="button" onClick={reset}>{tr("Submit another request")}</button>
              <a href="/">{tr("Go to dashboard")}</a>
            </div>
          </section>
        ) : (
          <>
            <section className="help-intro">
              <p className="eyebrow">{tr("FIVE WESTERN TAK DISTRICTS")}</p>
              <h1>{tr("Request flood assistance")}</h1>
              <p>{tr("Send a clear report to Help Without Frontiers. Provide a reachable phone number and the safest available location details.")}</p>
            </section>

            <section className="emergency-callout" role="alert">
              <span className="emergency-icon"><TriangleAlert size={23} /></span>
              <div><strong>{tr("This form is not emergency dispatch")}</strong><p>{tr("For immediate danger, trapped persons, or a medical emergency, call an official hotline now.")}</p></div>
              <a href="tel:1784"><Phone size={16} /><span>{tr("Disaster hotline")}</span><b>1784</b></a>
              <a href="tel:1669"><Phone size={16} /><span>{tr("Medical emergency")}</span><b>1669</b></a>
            </section>

            <div className="help-layout">
              <form className="help-form" onSubmit={submit}>
                <fieldset className="form-section">
                  <legend><span>01</span><b>{tr("Reporter and contact")}</b><small>* {tr("Required fields are marked")}</small></legend>
                  <div className="form-grid two-column">
                    <label><span>{tr("Full name")} *</span><input required maxLength={120} autoComplete="name" value={form.fullName} onChange={(event) => update("fullName", event.target.value)} /></label>
                    <label><span>{tr("Phone number")} *</span><input required maxLength={32} inputMode="tel" autoComplete="tel" placeholder="09x xxx xxxx" value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label>
                    <label><span>{tr("Alternate contact")}</span><input maxLength={120} value={form.alternateContact} onChange={(event) => update("alternateContact", event.target.value)} /></label>
                    <label><span>{tr("Preferred spoken language")} *</span><select required value={form.preferredLanguage} onChange={(event) => update("preferredLanguage", event.target.value)}>{["English", "Burmese", "Thai", "Karen", "Other"].map((item) => <option key={item} value={item}>{tr(item)}</option>)}</select></label>
                  </div>
                </fieldset>

                <fieldset className="form-section">
                  <legend><span>02</span><b>{tr("Location")}</b><small>{tr("Only the five target districts can be submitted")}</small></legend>
                  <div className="form-grid two-column">
                    <label><span>{tr("District")} *</span><select required value={form.district} onChange={(event) => update("district", event.target.value)}><option value="">{tr("Select district")}</option>{districts.map((district) => <option key={district.en} value={district.en}>{language === "my" ? district.my : language === "th" ? district.th : district.en}</option>)}</select></label>
                    <label><span>{tr("Village or ward")} *</span><input required maxLength={120} value={form.village} onChange={(event) => update("village", event.target.value)} /></label>
                    <label className="full-width"><span>{tr("Address, landmark, or access route")} *</span><textarea required maxLength={500} rows={3} value={form.locationDetails} onChange={(event) => update("locationDetails", event.target.value)} /></label>
                  </div>
                  <div className="location-capture">
                    <button type="button" onClick={getLocation} disabled={locating}><Crosshair size={16} /> {tr(locating ? "Getting location" : "Use my location")}</button>
                    {(form.latitude && form.longitude) && <span><MapPin size={14} /> {form.latitude}, {form.longitude}</span>}
                    {locationMessage && <small>{locationMessage}</small>}
                  </div>
                </fieldset>

                <fieldset className="form-section">
                  <legend><span>03</span><b>{tr("People needing assistance")}</b><small>{tr("Include everyone at this location")}</small></legend>
                  <div className="form-grid three-column">
                    <label><span>{tr("Total people")} *</span><input required type="number" min="1" max="500" value={form.peopleCount} onChange={(event) => update("peopleCount", event.target.value)} /></label>
                    <label><span>{tr("Children under 5")}</span><input type="number" min="0" max="100" value={form.childrenUnderFive} onChange={(event) => update("childrenUnderFive", event.target.value)} /></label>
                    <label><span>{tr("Adults 60 or older")}</span><input type="number" min="0" max="100" value={form.olderAdults} onChange={(event) => update("olderAdults", event.target.value)} /></label>
                  </div>
                  <label className="check-row"><input type="checkbox" checked={form.disabilityOrMobilityNeeds} onChange={(event) => update("disabilityOrMobilityNeeds", event.target.checked)} /><span>{tr("Someone has disability or mobility needs")}</span></label>
                </fieldset>

                <fieldset className="form-section">
                  <legend><span>04</span><b>{tr("Urgency")}</b><small>{tr("Choose the closest description")}</small></legend>
                  <div className="urgency-options">
                    {([
                      ["critical", "Critical", "Trapped, injured, or in immediate danger"],
                      ["urgent", "Urgent", "Help needed within several hours"],
                      ["routine", "Routine", "Stable now, but assistance is needed"],
                    ] as const).map(([value, title, description]) => (
                      <label className={form.urgency === value ? `selected ${value}` : ""} key={value}><input type="radio" name="urgency" value={value} checked={form.urgency === value} onChange={() => update("urgency", value)} /><span><b>{tr(title)}</b><small>{tr(description)}</small></span></label>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="form-section">
                  <legend><span>05</span><b>{tr("Assistance needed")}</b><small>{tr("Select all that apply")}</small></legend>
                  <div className="need-options">
                    {needOptions.map(([value, label]) => <label className={form.needs.includes(value) ? "selected" : ""} key={value}><input type="checkbox" checked={form.needs.includes(value)} onChange={() => toggleNeed(value)} /><span>{tr(label)}</span></label>)}
                  </div>
                  <label className="details-field"><span>{tr("Situation details")} *</span><textarea required maxLength={1500} rows={6} placeholder={tr("Describe water depth, injuries, isolation, road access, and immediate risks.")} value={form.details} onChange={(event) => update("details", event.target.value)} /></label>
                </fieldset>

                <div className="honeypot" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)} /></label></div>
                <label className="consent-row"><input required type="checkbox" checked={form.consent} onChange={(event) => update("consent", event.target.checked)} /><span>{tr("I agree that this information may be used to coordinate assistance and shared with responsible response partners.")}</span></label>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="submit-request" type="submit" disabled={submitting}><Send size={18} /> {tr(submitting ? "Submitting" : "Submit help request")}</button>
              </form>

              <aside className="help-sidebar">
                <section><HeartHandshake size={21} /><h2>{tr("Before submitting")}</h2><ul><li>{tr("Move to higher ground when it is safe to do so.")}</li><li>{tr("Do not cross moving floodwater or closed roads.")}</li><li>{tr("Keep your phone charged and answer unknown calls after submitting.")}</li></ul></section>
                <section><ShieldCheck size={21} /><h2>{tr("Information handling")}</h2><p>{tr("Contact and location details are stored privately for response coordination. Do not include identity documents, bank details, or passwords.")}</p></section>
                <section className="area-summary"><Users size={21} /><h2>{tr("FIVE WESTERN TAK DISTRICTS")}</h2><p>{districts.map((district) => language === "my" ? district.my : language === "th" ? district.th : district.en).join(" • ")}</p></section>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
