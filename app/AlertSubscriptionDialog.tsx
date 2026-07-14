"use client";

import { BellRing, CheckCircle2, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

type Language = "en" | "my" | "th";

const districts = ["All districts", "Mae Sot", "Umphang", "Tha Song Yang", "Mae Ramat", "Phop Phra"] as const;

const copy = {
  en: {
    title: "Subscribe to early warnings",
    intro: "Receive staff-approved flood warnings on this device, even when the dashboard is closed.",
    district: "Alert area",
    language: "Message language",
    consent: "I agree to receive flood warning notifications on this device.",
    subscribe: "Subscribe to alerts",
    subscribing: "Enabling alerts...",
    subscribed: "This device is subscribed",
    unsubscribe: "Unsubscribe this device",
    close: "Close",
    all: "All five districts",
    denied: "Notifications are blocked in this browser. Enable them in the browser site settings and try again.",
    unavailable: "Browser notifications are not supported on this device.",
    notConfigured: "Notification delivery is not configured on the server yet.",
    failed: "The subscription could not be saved. Please try again.",
    privacy: "You can unsubscribe at any time. No name or phone number is required.",
  },
  my: {
    title: "ကြိုတင်သတိပေးချက်များ ရယူရန်",
    intro: "ဒက်ရှ်ဘုတ်ပိတ်ထားချိန်တွင်ပင် ဝန်ထမ်းအတည်ပြုထားသော ရေဘေးသတိပေးချက်များကို ဤစက်တွင် ရယူပါ။",
    district: "သတိပေးမည့် ဧရိယာ",
    language: "စာတိုဘာသာစကား",
    consent: "ဤစက်တွင် ရေဘေးသတိပေးချက်များ လက်ခံရန် သဘောတူပါသည်။",
    subscribe: "သတိပေးချက် ရယူရန်",
    subscribing: "သတိပေးချက် ဖွင့်နေသည်...",
    subscribed: "ဤစက်သည် စာရင်းသွင်းပြီးပါပြီ",
    unsubscribe: "ဤစက်ကို စာရင်းမှပယ်ရန်",
    close: "ပိတ်ရန်",
    all: "ခရိုင်ငါးခုလုံး",
    denied: "ဤဘရောက်ဇာတွင် အသိပေးချက်များ ပိတ်ထားသည်။ Site settings မှ ဖွင့်ပြီး ထပ်မံကြိုးစားပါ။",
    unavailable: "ဤစက်တွင် ဘရောက်ဇာအသိပေးချက်များ မပံ့ပိုးပါ။",
    notConfigured: "ဆာဗာတွင် အသိပေးချက်ပို့ခြင်းကို မပြင်ဆင်ရသေးပါ။",
    failed: "စာရင်းသွင်းမှုကို မသိမ်းနိုင်ပါ။ ထပ်မံကြိုးစားပါ။",
    privacy: "အချိန်မရွေး စာရင်းမှပယ်နိုင်သည်။ အမည်နှင့် ဖုန်းနံပါတ် မလိုအပ်ပါ။",
  },
  th: {
    title: "สมัครรับคำเตือนภัยล่วงหน้า",
    intro: "รับคำเตือนน้ำท่วมที่เจ้าหน้าที่อนุมัติบนอุปกรณ์นี้ แม้ไม่ได้เปิดแดชบอร์ด",
    district: "พื้นที่รับแจ้งเตือน",
    language: "ภาษาของข้อความ",
    consent: "ฉันยินยอมรับการแจ้งเตือนภัยน้ำท่วมบนอุปกรณ์นี้",
    subscribe: "สมัครรับคำเตือน",
    subscribing: "กำลังเปิดการแจ้งเตือน...",
    subscribed: "อุปกรณ์นี้สมัครรับคำเตือนแล้ว",
    unsubscribe: "ยกเลิกการแจ้งเตือนอุปกรณ์นี้",
    close: "ปิด",
    all: "ทั้งห้าอำเภอ",
    denied: "เบราว์เซอร์บล็อกการแจ้งเตือน โปรดเปิดในการตั้งค่าเว็บไซต์แล้วลองอีกครั้ง",
    unavailable: "อุปกรณ์นี้ไม่รองรับการแจ้งเตือนผ่านเบราว์เซอร์",
    notConfigured: "เซิร์ฟเวอร์ยังไม่ได้ตั้งค่าการส่งการแจ้งเตือน",
    failed: "ไม่สามารถบันทึกการสมัครได้ โปรดลองอีกครั้ง",
    privacy: "ยกเลิกได้ทุกเมื่อ ไม่ต้องใช้ชื่อหรือหมายเลขโทรศัพท์",
  },
} as const;

const districtLabels: Record<Language, Record<string, string>> = {
  en: { "All districts": "All five districts", "Mae Sot": "Mae Sot", Umphang: "Umphang", "Tha Song Yang": "Tha Song Yang", "Mae Ramat": "Mae Ramat", "Phop Phra": "Phop Phra" },
  my: { "All districts": "ခရိုင်ငါးခုလုံး", "Mae Sot": "မဲဆောက်", Umphang: "အုန်းဖန်", "Tha Song Yang": "သာဆောင်ယန်း", "Mae Ramat": "မယ်ရမတ်", "Phop Phra": "ဖုပ်ဖရ" },
  th: { "All districts": "ทั้งห้าอำเภอ", "Mae Sot": "แม่สอด", Umphang: "อุ้มผาง", "Tha Song Yang": "ท่าสองยาง", "Mae Ramat": "แม่ระมาด", "Phop Phra": "พบพระ" },
};

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = atob(base64);
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

export default function AlertSubscriptionDialog({ language, open, onClose }: { language: Language; open: boolean; onClose: () => void }) {
  const text = copy[language];
  const [district, setDistrict] = useState<(typeof districts)[number]>("All districts");
  const [messageLanguage, setMessageLanguage] = useState<Language>(language);
  const [consent, setConsent] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setMessageLanguage(language);
    const savedDistrict = window.localStorage.getItem("floodwatch-alert-district");
    if (districts.includes(savedDistrict as (typeof districts)[number])) setDistrict(savedDistrict as (typeof districts)[number]);
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    void navigator.serviceWorker.register("/sw.js").then((registration) => registration.pushManager.getSubscription()).then((subscription) => setSubscribed(Boolean(subscription))).catch(() => undefined);
  }, [language, open]);

  async function subscribe() {
    setWorking(true);
    setMessage("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setMessage(text.unavailable);
        return;
      }
      const configResponse = await fetch("/api/alert-config", { cache: "no-store" });
      const config = await configResponse.json() as { enabled?: boolean; publicKey?: string };
      if (!config.enabled || !config.publicKey) {
        setMessage(text.notConfigured);
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage(text.denied);
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(config.publicKey) });
      const response = await fetch("/api/alert-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON(), district, language: messageLanguage, consent }),
      });
      if (!response.ok) throw new Error("Subscription save failed");
      window.localStorage.setItem("floodwatch-alert-district", district);
      setSubscribed(true);
      setMessage(text.subscribed);
    } catch {
      setMessage(text.failed);
    } finally {
      setWorking(false);
    }
  }

  async function unsubscribe() {
    setWorking(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/alert-subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setMessage("");
    } catch {
      setMessage(text.failed);
    } finally {
      setWorking(false);
    }
  }

  if (!open) return null;

  return (
    <div className="subscription-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="subscription-dialog" role="dialog" aria-modal="true" aria-labelledby="subscription-title">
        <header>
          <span className="subscription-icon"><BellRing size={22} /></span>
          <div><h2 id="subscription-title">{text.title}</h2><p>{text.intro}</p></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label={text.close} title={text.close}><X size={19} /></button>
        </header>

        {subscribed ? (
          <div className="subscription-complete">
            <CheckCircle2 size={24} />
            <div><strong>{text.subscribed}</strong><span>{text.privacy}</span></div>
            <button type="button" onClick={() => void unsubscribe()} disabled={working}>{text.unsubscribe}</button>
          </div>
        ) : (
          <div className="subscription-form">
            <label><span>{text.district}</span><select value={district} onChange={(event) => setDistrict(event.target.value as (typeof districts)[number])}>{districts.map((item) => <option key={item} value={item}>{districtLabels[language][item]}</option>)}</select></label>
            <label><span>{text.language}</span><select value={messageLanguage} onChange={(event) => setMessageLanguage(event.target.value as Language)}><option value="en">English</option><option value="my">မြန်မာ</option><option value="th">ไทย</option></select></label>
            <label className="subscription-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>{text.consent}</span></label>
            <button className="subscribe-submit" type="button" disabled={!consent || working} onClick={() => void subscribe()}><BellRing size={18} /> {working ? text.subscribing : text.subscribe}</button>
          </div>
        )}

        {message && <p className={`subscription-message ${subscribed ? "success" : ""}`} role="status">{message}</p>}
        <p className="subscription-privacy"><ShieldCheck size={15} /> {text.privacy}</p>
      </section>
    </div>
  );
}
