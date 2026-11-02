# Isdhis Academy — React + Vite + Firebase

Website E-Learning (LMS) ah oo leh: Public Website, Student Dashboard, Admin Dashboard, iibinta courses-ka, lacag-bixin gacanta lagu xaqiijiyo (EVC Plus / Zaad / Sahal), ilaalinta casharrada, device restriction iyo certificates.

Backend: Firebase project-kaaga **Barakaat (`barakaat-a9fe1`)** — Firestore, Authentication, Storage.

---

## 1. Ku shid (run) kombiyuutarkaaga

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ folder-ka production
```

Firebase config-ka hore ayuu ugu jiraa `src/firebase.js`. `.env` looma baahna.

---

## 2. Firebase Console — waxyaabaha waa in la shido (hal mar)

1. **Authentication → Sign-in method**
   - ✅ **Email/Password** (ardayda)
   - ✅ **Anonymous** (admin login-ka ayaa isticmaala — eeg qaybta 3)
2. **Authentication → Settings → Authorized domains**: ku dar domain-ka website-ka (tusaale `isdhis-academy.web.app`).
3. **Firestore Rules**: fur `firebase-rules/firestore.isdhis.rules`, **koobi functions-ka iyo dhammaan `match /Isdhis…` blocks-ka**, kuna dheji GUDAHA rules-kaaga hadda jira. ⚠️ Ha beddelin rules-ka oo dhan — waxaa ku jira apps kale (Barakaat, dream-market).
4. **Storage Rules**: si la mid ah, ku dar blocks-ka `firebase-rules/storage.isdhis.rules`. Marka la publish-gareeyo, oggolow ("Grant") in Storage uu akhriyo Firestore.

---

## 3. Admin login — `IsdhisAdmin`

Admin-ku wuxuu ku galayaa collection-ka aad horay u samaysay:

```
IsdhisAdmin / superadmin   { username: "imam", password: "…", role: "admin" }
```

- URL: **`/admin/login`** → username `imam` + password-kaaga.
- Browser-ku **weligiis ma akhriyo** `IsdhisAdmin`. Wuxuu isku dayaa inuu abuuro `IsdhisAdminSessions/{uid}`; Firestore rules-ka ayaa server-ka ku barbar dhiga username/password. Haddii ay is waafaqaan, session-ka waa la abuuraa, admin rules-kuna waxay hubiyaan session-kaas.
- Admin dheeraad ah: ku dar document cusub `IsdhisAdmin`, kuna dar ID-giisa `VITE_ISDHIS_ADMIN_DOC_IDS` (`.env`), ama document ID-ga ka dhig la mid username-ka.
- ⚠️ **Beddel password-ka "1234"** — Admin → Website Settings → Admin password (ugu yaraan 6 xaraf, ka dheer = ka ammaan badan).

---

## 4. Collections — dhammaan waxay ku bilaabmaan "Isdhis"

| Collection | Waxa lagu kaydiyo |
|---|---|
| `IsdhisAdmin` | Admin accounts (adigaa sameeyay) |
| `IsdhisAdminSessions` | Admin sessions-ka firfircoon |
| `IsdhisUsers` | Ardayda (profiles) |
| `IsdhisCourses` | Courses |
| `IsdhisLessons` | Casharrada (`courseId`, video/PDF/images paths) |
| `IsdhisCategories` | Categories |
| `IsdhisPayments` | Payment submissions (pending/approved/rejected) |
| `IsdhisEnrollments` | `{uid}_{courseId}` — ardayda course-ka furan |
| `IsdhisProgress` | Casharrada la dhammaystiray |
| `IsdhisDevices` | Device-ka active-ka ah ee arday kasta |
| `IsdhisCertificates` | Certificates |
| `IsdhisReviews` | Reviews & ratings |
| `IsdhisCoupons` | Discount codes |
| `IsdhisNotifications` | Ogeysiisyada ardayga/admin-ka |
| `IsdhisMessages` | Contact form |
| `IsdhisMail` | Email outbox |
| `IsdhisSettings/site` | Website settings (logo, payment numbers, …) |

Storage: dhammaan files-ku waxay galaan folder-ka **`Isdhis/`**.

---

## 5. Sida ay u shaqeyso

**Iibsashada:** Buy Course → login → Payment page (number-ka, qiimaha, instructions) → Transaction ID + phone + screenshot → `Pending` → Admin → Payments → **Approve** (enrollment ayaa la abuuraa, course-ku wuxuu ka muuqdaa My Courses, ogeysiis + email) ama **Reject** (sabab + oggolaansho dib u submit).

**Ilaalinta:** Videos/PDFs waxay ku jiraan Storage private ah; Storage rules-ka ayaa hubiya enrollment-ka (ama "Preview lesson"). Ardayga la xannibay ma furi karo casharro. Video-ga waxaa ku dul socda watermark (email + phone) si screen recording loo raadraaco.

**Device restriction:** device-ka ugu horreeya ee cashar fura ayaa noqda active. Device kale wuu xirmaa → ardaygu wuxuu codsan karaa reset → Admin → Students → Manage → Reset device. Waa la dami karaa: Website Settings.

> Ogow: browser caadi ah si buuxda ugama hortagi karo screen recording. Ilaalin xooggan waxay u baahan tahay DRM video hosting (tusaale Mux, VdoCipher).

**Emails:** emails-ka waxaa lagu qoraa `IsdhisMail`. Si ay si toos ah u baxaan, ku rakib Firebase extension-ka **"Trigger Email from Firestore"**, collection-kana u dhig `IsdhisMail`.

---

## 6. Deploy (Firebase Hosting)

Project-kaaga Barakaat wuxuu hore u leeyahay hosting site. Si aanad u tirtirin, samee site cusub:

```bash
npm i -g firebase-tools
firebase login
firebase hosting:sites:create isdhis-academy
npm run build
firebase deploy --only hosting:isdhis-academy
```

`firebase.json` wuxuu tilmaamayaa site-ka `isdhis-academy` oo keliya — rules-ka **ma** deploy-gareeyo (gacanta ku dar, sida qaybta 2).

---

## 7. Tallaabooyinka ugu horreeya kadib deploy

1. `/admin/login` → gal.
2. Website Settings → geli payment numbers-ka rasmiga ah (EVC Plus/Zaad/Sahal), logo, contact, categories → **Save settings**.
3. Courses → Add New Course → Status: Published.
4. Lessons → dooro course → Add Lesson (video, PDF, images).
5. Furo website-ka — course-ku wuxuu ka muuqanayaa Home & All Courses.

---

## 8. Cilad-bixin (Troubleshooting)

- **Page-ku wuu madoobaadaa / "0 lessons" khaldan / ereyo rogan** → Google Translate ayaa sababay. Website-ka hadda wuu xannibayaa turjumaadda. Haddii Chrome weli turjumo: calaamadda address bar-ka → "Show original" / "Never translate this site".
- **"This login feature is not enabled"** marka arday is-diiwaan geliyo → Firebase Console → Authentication → Sign-in method → **Email/Password → Enable**.
- **Website-ku waa gaabis** → `npm run dev` waa qaab horumarineed oo gaabis ah. Si aad u aragto xawaaraha dhabta ah: `npm run build && npm run preview`, ama deploy garee.
- **Video upload-ku wuu gaabis yahay** → xawaaraha internet-kaaga (upload) ayuu ku xiran yahay. Ku compress garee video-ga 720p (HandBrake, "Fast 720p30") — inta badan 5-10 jeer ayuu yaraadaa. Ha xirin tab-ka inta upload-ku socdo.
- **Sawirrada casharrada hore** ee aan bogga course-ka ka muuqan → Admin → Lessons → Edit → Save (link-ga public-ka ah ayaa la keydinayaa). Sidoo kale cusbooneysii Storage rules-ka (`firebase-rules/storage.isdhis.rules`).
