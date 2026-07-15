"use client";

import { BellRing, CheckCircle2, MonitorCheck, Share2, ShieldCheck, X } from "lucide-react";
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

const cadenceCopy: Record<Language, string> = {
  en: "While a staff-approved warning is active, reminders are scheduled around 01:00, 07:00, 13:00, and 19:00 Thailand time.",
  my: "တာဝန်ရှိသူ အတည်ပြုထားသော သတိပေးချက် အသက်ဝင်နေစဉ် ထိုင်းစံတော်ချိန် 01:00၊ 07:00၊ 13:00 နှင့် 19:00 ဝန်းကျင်တွင် တစ်နေ့လျှင် လေးကြိမ် သတိပေးချက်ပို့ရန် စီစဉ်ထားသည်။",
  th: "เมื่อคำเตือนที่เจ้าหน้าที่อนุมัติยังมีผล ระบบจะส่งการแจ้งเตือนประมาณ 01:00, 07:00, 13:00 และ 19:00 น. ตามเวลาประเทศไทย",
};

const fallbackCopy = {
  en: {
    title: "Background alerts are unavailable in this browser",
    detail: "Save your area and language for staff-approved warnings shown in this dashboard. The page checks for new warnings every minute while it is open.",
    save: "Save dashboard alerts",
    saved: "Dashboard alert preferences saved",
    savedDetail: "This dashboard checks for new staff-approved warnings every minute while it is open.",
    remove: "Remove saved alerts",
    share: "Share or copy website link",
    shared: "The website link is ready to open in Chrome, Edge, or Safari for background alerts.",
    shareFailed: "Open this address in Chrome, Edge, or Safari: https://takfloodwatch.vercel.app",
    configuredFallback: "Background delivery is temporarily unavailable.",
  },
  my: {
    title: "ဤဘရောက်ဇာတွင် နောက်ခံအသိပေးချက် မရနိုင်ပါ",
    detail: "ဤဒက်ရှ်ဘုတ်တွင် ပြသသော တာဝန်ရှိသူအတည်ပြု သတိပေးချက်များအတွက် နယ်မြေနှင့် ဘာသာစကားကို သိမ်းထားပါ။ စာမျက်နှာဖွင့်ထားစဉ် မိနစ်တိုင်း သတိပေးချက်အသစ်ကို စစ်ဆေးပါမည်။",
    save: "ဒက်ရှ်ဘုတ် သတိပေးချက် သိမ်းမည်",
    saved: "ဒက်ရှ်ဘုတ် သတိပေးချက် ရွေးချယ်မှု သိမ်းပြီးပါပြီ",
    savedDetail: "ဤဒက်ရှ်ဘုတ်ဖွင့်ထားစဉ် တာဝန်ရှိသူအတည်ပြု သတိပေးချက်အသစ်ကို မိနစ်တိုင်း စစ်ဆေးပါမည်။",
    remove: "သိမ်းထားသော သတိပေးချက် ဖယ်ရှားရန်",
    share: "ဝဘ်ဆိုက်လင့်ခ် မျှဝေ သို့မဟုတ် ကူးယူရန်",
    shared: "နောက်ခံအသိပေးချက်များအတွက် ဝဘ်ဆိုက်လင့်ခ်ကို Chrome၊ Edge သို့မဟုတ် Safari တွင် ဖွင့်နိုင်ပါပြီ။",
    shareFailed: "ဤလိပ်စာကို Chrome၊ Edge သို့မဟုတ် Safari တွင် ဖွင့်ပါ: https://takfloodwatch.vercel.app",
    configuredFallback: "နောက်ခံပို့ဆောင်မှုကို ယာယီအသုံးမပြုနိုင်ပါ။",
  },
  th: {
    title: "เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนเบื้องหลัง",
    detail: "บันทึกพื้นที่และภาษาสำหรับคำเตือนที่เจ้าหน้าที่อนุมัติซึ่งแสดงในแดชบอร์ด หน้านี้จะตรวจสอบคำเตือนใหม่ทุกนาทีขณะที่เปิดอยู่",
    save: "บันทึกการเตือนในแดชบอร์ด",
    saved: "บันทึกการตั้งค่าการเตือนในแดชบอร์ดแล้ว",
    savedDetail: "แดชบอร์ดจะตรวจสอบคำเตือนใหม่ที่เจ้าหน้าที่อนุมัติทุกนาทีขณะที่เปิดอยู่",
    remove: "ลบการเตือนที่บันทึกไว้",
    share: "แชร์หรือคัดลอกลิงก์เว็บไซต์",
    shared: "ลิงก์เว็บไซต์พร้อมเปิดใน Chrome, Edge หรือ Safari เพื่อรับการแจ้งเตือนเบื้องหลัง",
    shareFailed: "เปิดที่อยู่นี้ใน Chrome, Edge หรือ Safari: https://takfloodwatch.vercel.app",
    configuredFallback: "การส่งการแจ้งเตือนเบื้องหลังไม่พร้อมใช้งานชั่วคราว",
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

function browserPushAvailable() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export default function AlertSubscriptionDialog({ language, open, onClose }: { language: Language; open: boolean; onClose: () => void }) {
  const text = copy[language];
  const fallback = fallbackCopy[language];
  const [district, setDistrict] = useState<(typeof districts)[number]>("All districts");
  const [messageLanguage, setMessageLanguage] = useState<Language>(language);
  const [consent, setConsent] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<"push" | "dashboard" | null>(null);
  const [pushAvailable, setPushAvailable] = useState<boolean | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    const savedDistrict = window.localStorage.getItem("floodwatch-alert-district");
    const savedLanguage = window.localStorage.getItem("floodwatch-alert-language");
    const savedMode = window.localStorage.getItem("floodwatch-alert-mode");
    if (districts.includes(savedDistrict as (typeof districts)[number])) setDistrict(savedDistrict as (typeof districts)[number]);
    setMessageLanguage(savedLanguage === "en" || savedLanguage === "my" || savedLanguage === "th" ? savedLanguage : language);
    const supportsPush = browserPushAvailable();
    setPushAvailable(supportsPush);
    if (savedMode === "dashboard") {
      setSubscribed(true);
      setDeliveryMode("dashboard");
    }
    if (!supportsPush) return;
    void navigator.serviceWorker.register("/sw.js")
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!subscription) return;
        setSubscribed(true);
        setDeliveryMode("push");
      })
      .catch(() => undefined);
  }, [language, open]);

  function saveDashboardAlerts(prefix = "") {
    window.localStorage.setItem("floodwatch-alert-district", district);
    window.localStorage.setItem("floodwatch-alert-language", messageLanguage);
    window.localStorage.setItem("floodwatch-alert-mode", "dashboard");
    window.dispatchEvent(new Event("floodwatch-alert-preferences"));
    setSubscribed(true);
    setDeliveryMode("dashboard");
    setMessage(prefix ? `${prefix} ${fallback.saved}` : fallback.saved);
  }

  async function shareWebsite() {
    setMessage("");
    try {
      const url = "https://takfloodwatch.vercel.app";
      if (navigator.share) await navigator.share({ title: document.title, url });
      else await navigator.clipboard.writeText(url);
      setMessage(fallback.shared);
    } catch {
      setMessage(fallback.shareFailed);
    }
  }

  async function subscribe() {
    setWorking(true);
    setMessage("");
    try {
      if (!browserPushAvailable()) {
        saveDashboardAlerts();
        return;
      }
      const configResponse = await fetch("/api/alert-config", { cache: "no-store" });
      const config = await configResponse.json() as { enabled?: boolean; publicKey?: string };
      if (!config.enabled || !config.publicKey) {
        saveDashboardAlerts(fallback.configuredFallback);
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
      window.localStorage.setItem("floodwatch-alert-language", messageLanguage);
      window.localStorage.setItem("floodwatch-alert-mode", "push");
      window.dispatchEvent(new Event("floodwatch-alert-preferences"));
      setSubscribed(true);
      setDeliveryMode("push");
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
      if (deliveryMode === "push" && browserPushAvailable()) {
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
      }
      window.localStorage.removeItem("floodwatch-alert-mode");
      window.localStorage.removeItem("floodwatch-alert-language");
      window.dispatchEvent(new Event("floodwatch-alert-preferences"));
      setSubscribed(false);
      setDeliveryMode(null);
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
          <div><h2 id="subscription-title">{text.title}</h2><p>{text.intro}</p>{pushAvailable !== false && <small className="subscription-cadence">{cadenceCopy[language]}</small>}</div>
          <button className="icon-button" type="button" onClick={onClose} aria-label={text.close} title={text.close}><X size={19} /></button>
        </header>

        {subscribed ? (
          <div className="subscription-complete">
            <CheckCircle2 size={24} />
            <div>
              <strong>{deliveryMode === "dashboard" ? fallback.saved : text.subscribed}</strong>
              <span>{deliveryMode === "dashboard" ? fallback.savedDetail : text.privacy}</span>
              {deliveryMode === "push" && <span className="subscription-cadence">{cadenceCopy[language]}</span>}
            </div>
            <button type="button" onClick={() => void unsubscribe()} disabled={working}>{deliveryMode === "dashboard" ? fallback.remove : text.unsubscribe}</button>
          </div>
        ) : (
          <div className="subscription-form">
            {pushAvailable === false && (
              <div className="subscription-fallback" role="note">
                <MonitorCheck size={21} />
                <div><strong>{fallback.title}</strong><span>{fallback.detail}</span></div>
                <button type="button" onClick={() => void shareWebsite()}><Share2 size={15} /> {fallback.share}</button>
              </div>
            )}
            <label><span>{text.district}</span><select value={district} onChange={(event) => setDistrict(event.target.value as (typeof districts)[number])}>{districts.map((item) => <option key={item} value={item}>{districtLabels[language][item]}</option>)}</select></label>
            <label><span>{text.language}</span><select value={messageLanguage} onChange={(event) => setMessageLanguage(event.target.value as Language)}><option value="en">English</option><option value="my">မြန်မာ</option><option value="th">ไทย</option></select></label>
            <label className="subscription-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>{text.consent}</span></label>
            <button className="subscribe-submit" type="button" disabled={!consent || working} onClick={() => void subscribe()}>
              {pushAvailable === false ? <MonitorCheck size={18} /> : <BellRing size={18} />}
              {working ? text.subscribing : pushAvailable === false ? fallback.save : text.subscribe}
            </button>
          </div>
        )}

        {message && <p className={`subscription-message ${subscribed || message === fallback.shared ? "success" : ""}`} role="status">{message}</p>}
        <p className="subscription-privacy"><ShieldCheck size={15} /> {text.privacy}</p>
      </section>
    </div>
  );
}
