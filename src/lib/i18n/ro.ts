import type { Dict } from "./en";

const ro: Dict = {
  meta: { title: "Carlala · Mașina de lângă tine, cu ora", description: "Închiriază mașini de la vecinii tăi din București sau câștigă din mașina pe care o folosești rar." },
  nav: { find: "Caută o mașină", list: "Listează-ți mașina", myCars: "Mașinile mele", trips: "Rezervările mele", requests: "Cereri", admin: "Admin", login: "Intră în cont", signup: "Creează cont", logout: "Ieși din cont", menu: "Cont" },
  home: {
    eyebrow: "București",
    h1: "Mașina de lângă tine, cu ora.",
    sub: "Închiriază o mașină parcată aproape de tine, de la cineva din cartierul tău. Rezervi în două minute, cu asigurare la fiecare închiriere.",
    where: "Unde", from: "De la", until: "Până la", anySector: "Tot Bucureștiul", search: "Caută o mașină",
    featured: "Mașini lângă tine", seeAll: "Vezi toate mașinile",
    howTitle: "Cum funcționează",
    how1h: "Găsește o mașină aproape", how1p: "Caută după sector și oră. Vezi poze, prețul și recenziile.",
    how2h: "Trimite cererea și plătește", how2p: "Proprietarul îți acceptă cererea, apoi plătești sigur online.",
    how3h: "Ia cheile și pornește", how3p: "Iei cheile de la proprietar și aduci mașina înapoi pe aceeași stradă.",
    ownerTitle: "Mașina ta poate câștiga cât stă parcată.", ownerP: "O listezi în zece minute. Tu alegi prețul, zilele și cine o conduce.", ownerCta: "Listează-ți mașina",
  },
  search: {
    title: "Mașini în București", results: "{n} mașini disponibile", resultsOne: "1 mașină disponibilă",
    none: "Nicio mașină nu se potrivește căutării.", noneHint: "Încearcă alt sector, alte ore sau renunță la un filtru.",
    transmission: "Cutie de viteze", fuel: "Combustibil", any: "Oricare", apply: "Caută", perHour: "/ oră", perDay: "/ zi",
    datesHint: "Adaugă datele ca să vezi doar mașinile libere și prețul total.", totalFor: "{price} în total",
  },
  car: {
    about: "Despre mașină", seats: "{n} locuri", year: "An", location: "Zona de preluare", owner: "Proprietar", memberSince: "Pe Carlala din {date}",
    reviews: "Recenzii", noReviews: "Încă nu are recenzii.", bookTitle: "Rezervă mașina", start: "Preluare", end: "Returnare",
    breakdownDays: "{n} × zi", breakdownHours: "{n} × oră", total: "Total", feeNote: "Asigurarea și serviciul Carlala sunt incluse.",
    message: "Mesaj pentru proprietar (opțional)", messagePlaceholder: "Bună! Am nevoie de mașină pentru un weekend la Brașov.",
    request: "Trimite cererea", loginToBook: "Intră în cont ca să rezervi", ownCar: "Aceasta este mașina ta.", paused: "Mașina nu este disponibilă momentan.",
    requestSent: "Cererea a fost trimisă. Vei putea plăti imediat ce proprietarul o acceptă.", notFound: "Mașina nu există sau a fost ștearsă.",
    perHour: "pe oră", perDay: "pe zi", updatePrice: "Actualizează prețul",
  },
  auth: {
    loginTitle: "Intră în cont", signupTitle: "Creează-ți contul", email: "Email", password: "Parolă", name: "Nume complet", phone: "Telefon (opțional)",
    login: "Intră în cont", signup: "Creează contul", noAccount: "Ești nou pe Carlala?", haveAccount: "Ai deja cont?",
    errInvalid: "Emailul sau parola nu sunt corecte.", errExists: "Există deja un cont cu acest email. Intră în cont.",
    errPassword: "Folosește cel puțin 8 caractere pentru parolă.", errName: "Introdu numele tău.", errEmail: "Introdu o adresă de email validă.",
    terms: "Prin crearea contului confirmi că ai cel puțin 18 ani și că ai citit", privacyLink: "politica de confidențialitate", suspended: "Acest cont este suspendat. Scrie-ne la hello@carlala.eu.",
  },
  myCars: {
    title: "Mașinile mele", add: "Adaugă o mașină", empty: "Încă nu ai listat nicio mașină.", emptyHint: "Listează-ți mașina și câștigă cât stă parcată.",
    edit: "Modifică", pause: "Pune pe pauză", resume: "Afișează anunțul", paused: "Pe pauză", live: "Activ", blocked: "Ascuns de Carlala",
    view: "Vezi anunțul",
  },
  carForm: {
    newTitle: "Listează-ți mașina", editTitle: "Modifică mașina", make: "Marcă", model: "Model", year: "An", seats: "Locuri",
    transmission: "Cutie de viteze", fuel: "Combustibil", sector: "Sector", neighbourhood: "Cartier", neighbourhoodHint: "ex. Floreasca, Titan, Drumul Taberei",
    description: "Descriere", descriptionHint: "Starea mașinii, ce include (scaun de copil, încărcătoare), cum se face preluarea.",
    pricePerHour: "Preț pe oră (RON)", pricePerDay: "Preț pe zi (RON)", priceHint: "Prețul pe zi ar trebui să fie mai mic decât 24 de ore la prețul pe oră.",
    uploading: "Se încarcă…", uploadFailed: "O poză nu a putut fi încărcată. Încearcă din nou sau folosește un JPG sau PNG sub 5 MB.",
    photos: "Poze", photosHint: "Până la 6 poze, JPG, PNG sau WebP. Pozele mari sunt micșorate automat.", removePhoto: "Șterge",
    save: "Salvează", create: "Publică anunțul", saved: "Salvat.",
    errRequired: "Completează toate câmpurile obligatorii.", errPrice: "Prețurile trebuie să fie între 1 și 5.000 RON.", errYear: "Introdu un an între 1990 și anul viitor.",
    errPhoto: "Pozele trebuie să fie JPG, PNG sau WebP și mai mici de 5 MB.", errDayPrice: "Prețul pe zi trebuie să fie cel puțin cât prețul pe oră.",
  },
  trips: {
    title: "Rezervările mele", empty: "Încă nu ai rezervat nicio mașină.", emptyCta: "Caută o mașină",
    pay: "Plătește {price}", cancel: "Anulează", review: "Evaluează proprietarul", reviewed: "Evaluat", with: "Proprietar: {name}",
    waiting: "Așteptăm răspunsul proprietarului.", acceptedHint: "Acceptată! Plătește ca să confirmi rezervarea.",
  },
  requests: {
    title: "Cereri pentru mașinile mele", empty: "Încă nu ai cereri.", accept: "Acceptă", decline: "Refuză", complete: "Marchează ca încheiată",
    from: "De la {name}", earnings: "Câștigi {price}", review: "Evaluează șoferul", reviewed: "Evaluat", conflict: "Se suprapune cu o rezervare deja acceptată.",
  },
  status: { REQUESTED: "Cerere trimisă", ACCEPTED: "Acceptată, așteaptă plata", PAID: "Confirmată", COMPLETED: "Încheiată", DECLINED: "Refuzată", CANCELLED: "Anulată", EXPIRED: "Expirată" },
  review: { title: "Cum a fost?", rating: "Notă", comment: "Comentariu (opțional)", submit: "Publică recenzia", stars: "{n} din 5" },
  pay: {
    simTitle: "Plată de test", simText: "Stripe nu este încă conectat, așa că această pagină simulează plata. Nu se mișcă bani.",
    simPay: "Simulează plata reușită", simCancel: "Înapoi la rezervări", success: "Plata a fost primită. Rezervarea este confirmată.",
    cancelled: "Plata a fost anulată. Poți încerca din nou din Rezervările mele.", failed: "Nu am putut porni plata. Încearcă din nou peste un minut.",
    unavailable: "Ne pare rău, mașina a fost rezervată de altcineva pentru aceste ore.",
  },
  admin: {
    title: "Admin", users: "Utilizatori", cars: "Mașini", bookings: "Rezervări", revenue: "Comisioane Carlala (rezervări plătite)",
    suspend: "Suspendă", unsuspend: "Reactivează", block: "Ascunde", unblock: "Afișează", owner: "Proprietar", renter: "Șofer", status: "Stare", when: "Când", total: "Total",
  },
  errors: {
    end_before_start: "Ora de returnare trebuie să fie după ora de preluare.", too_short: "Închirierea minimă este de 1 oră.",
    too_long: "Închirierea maximă este de 30 de zile.", in_past: "Ora de preluare este în trecut.", unavailable: "Mașina este deja rezervată pentru o parte din acest interval.",
    generic: "Ceva nu a mers. Încearcă din nou.", forbidden: "Nu poți face asta.", dates: "Alege ora de preluare și de returnare.",
  },
  footer: { tagline: "Mașina de lângă tine, cu ora.", privacy: "Confidențialitate", cookies: "Cookie-uri", contact: "hello@carlala.eu", company: "GUFFROY SRL · CUI 51319110" },
  sectors: { S1: "Sector 1", S2: "Sector 2", S3: "Sector 3", S4: "Sector 4", S5: "Sector 5", S6: "Sector 6", ILFOV: "Ilfov" },
  transmission: { MANUAL: "Manuală", AUTOMATIC: "Automată" },
  fuel: { PETROL: "Benzină", DIESEL: "Motorină", HYBRID: "Hibrid", ELECTRIC: "Electric", LPG: "GPL" },
  common: { back: "Înapoi", save: "Salvează", cancel: "Renunță", language: "Limba", example: "Exemplu", required: "obligatoriu" },
};

export default ro;
