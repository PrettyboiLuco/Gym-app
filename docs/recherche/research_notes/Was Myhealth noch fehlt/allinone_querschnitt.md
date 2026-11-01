# All-in-one-Gesundheits-/Fitness-Apps und übergreifende Erfolgsfaktoren (Stand Nov. 2026)

Scope: features and product patterns beyond single-domain apps, to compare against "Myhealth" (training + nutrition + body progress + coach). Research date: 2026-11-01. Note: two hosts (blog.google, unstar.app) could not be fetched in this session (network allowlist), so the Google and review-analysis findings rely on search-result summaries rather than the full pages. Many comparison pages are written by competing apps; this is flagged where relevant.

## AI coaching: chat assistants over own data, weekly reviews, photo/voice logging, safety

### Takeaway
By 2026 every major platform has an LLM coach that works over the user's own data: Google (Gemini coach in the Fitbit app, now renamed Google Health), Whoop (Coach, GPT-based), Oura (Advisor), Bevel (Intelligence) and Samsung ("proactive guidance"). Apple is the exception. It shipped only Workout Buddy, in-workout audio motivation, and reportedly shelved its full AI health coach. The coaches now reach into medical records, CGM data and labs. AI photo food logging has become a free commodity, but independent tests show it is inaccurate.

### Cited Findings
**Google / Fitbit / Google Health**
- The revamped Fitbit app with a Gemini coach rolled out to Premium users in October 2025, at first as a US Android preview — [TechCrunch](https://techcrunch.com/2025/10/27/fitbits-revamped-app-with-gemini-powered-health-coach-rolls-out-to-premium-users/); [MobiHealthNews](https://www.mobihealthnews.com/news/google-debuts-gemini-powered-ai-health-coach-fitbit-and-pixel-watch-users)
- The Fitbit app is becoming the "Google Health app", a central hub for wellness data. Rollout to all users began on 19 May 2026, according to Google's announcement (seen in a search summary; page not fetchable) — [Google Blog: Introducing the Google Health app](https://blog.google/products-and-platforms/products/google-health/google-health-app/)
- The April 2026 preview update (v4.68) added fitness-coach recommendations, step-by-step guided workout execution, coaching messages in the "Today" tab and conversational check-ins. Sleep got an updated sleep score and editable sleep logs — [Jetstream blog](https://jetstream.blog/en/whats-new-in-fitbit-personal-health-coach-v4-68/)
- Users can connect their medical records so the coach gives "better, safer" advice. A CGM can be connected via Health Connect so users can ask how a workout or a slice of pizza affects their glucose (Public Preview, March 2026). The coach also helps users prepare for doctor's visits, summarize their health history and navigate life stages such as menopause — [Google Blog 2026 coach updates](https://blog.google/products-and-platforms/devices/fitbit/fitbit-personal-health-coach-updates-2026/)
- The coach reportedly sits behind a subscription of about $9.99/month. This is unverified and comes from a third-party site — [sensai.fit](https://www.sensai.fit/blog/google-health-premium-fitbit-ai-coach-2026)

**Apple**
- Workout Buddy (watchOS 26, WWDC 2025) gives generative spoken motivation based on workout data and fitness history. It covers running, walking, cycling, HIIT and strength. It is off by default, must be enabled per workout type, and needs an Apple Intelligence iPhone nearby — [Apple Support](https://support.apple.com/en-us/123002); [DC Rainmaker](https://www.dcrainmaker.com/2025/06/apple-watchos-26-announced-workout-buddy-and-more-explained.html); [AppleInsider](https://appleinsider.com/articles/25/09/15/watchos-26-is-here-and-features-ai-coaching-improved-health-tools)
- Bloomberg reportedly said on 5 Feb 2026 that Apple's AI health coach project ("Mulberry"/Health+) was wound down, and the redesigned Health app at WWDC 2026 had no AI coach. This comes second-hand from a competitor's blog citing Bloomberg; Apple has not confirmed it — [Ness Health blog](https://ness-health.com/blog/apple-ai-health-coach-killed)

**Whoop / Oura / Bevel / Samsung**
- Whoop Coach is powered by ChatGPT and gives personalized insights from historical data. It is included in every membership. Reviewers say it is siloed to Whoop data, with no nutrition, bloodwork or mental-health input (comparison blog) — [Ness Health comparison](https://ness-health.com/blog/ai-health-coaches-compared); [Healify](https://www.healify.ai/blog/best-ai-health-coach-apps-2026)
- Oura Advisor is an LLM assistant over sleep, activity, readiness and stress data. It renders data as charts and offers pre-written prompts. In April 2026 Oura added its "first-ever proprietary large language model designed for women's health". Advisor is included in the membership ($5.99/month or $69.99/year in the US) — [Oura blog](https://ouraring.com/blog/oura-advisor/); [Wareable](https://www.wareable.com/news/oura-advisor-puts-ai-coaching-on-hand)
- Bevel Pro costs $14.99/month or $99.99/year and adds Bevel Intelligence (AI coach), Biological Age and Health Records (lab import). Coach usage is a weekly allowance that resets every 7 days, with top-up credits available. AI food logging by photo or description and AI workout-template generation are free and unmetered — [Gadgets & Wearables, Dec 2025](https://gadgetsandwearables.com/2025/12/21/bevel-app-free/); [App Store: Bevel](https://apps.apple.com/us/app/bevel-all-in-one-health-app/id6456176249)
- Samsung's newsroom (4 June 2026) describes an update that moves Samsung Health "from passive tracking to proactive guidance with a suite of personalized, intuitive daily insights". Bedtime Guidance suggests a bedtime from 3 days of circadian-rhythm and sleep-pressure analysis. The Antioxidant Index (skin carotenoids, 0–100) got trend charts linked to diet. Running Coach builds 5K-to-marathon plans — [Samsung Newsroom US](https://news.samsung.com/us/?p=86238); [Samsung Global, Watch8 launch 2025](https://news.samsung.com/global/galaxy-unpacked-2025-a-first-look-at-the-galaxy-watch8-series-streamlining-sleep-exercise-and-everything-in-between)
- Freeletics: the AI coach "creates every workout based on your goals, fitness level, training preferences". It generates a weekly schedule after an intake assessment, and a Nutrition Coach add-on costs extra — [App Store: Freeletics](https://apps.apple.com/app/id654810212); [ConsumerAffairs](https://www.consumeraffairs.com/health/freeletics.html)
- Fastic has an AI chatbot ("Fasty") for nutrition and fasting questions and an AI food scanner. Zero Plus includes "Ask Zero" and a Protein Score (aggregator sources) — [Similarweb listing Fastic](https://similarweb.com/app/apple/1459260306); [AppleVis Zero](https://applevis.com/apps/ios/health-fitness/zero-fasting-health-tracker)

**Photo / voice food logging**
- MyFitnessPal acquired the photo-calorie app Cal AI. Reports say the deal closed in Dec 2025 and was announced in March 2026 — [Fitt Insider](https://insider.fitt.co/myfitnesspal-acquires-rival-food-tracker-cal-ai/)
- An NIH-linked study presented at NUTRITION 2026 ran 102 weighed meals through 4 apps' photo features. The apps missed by 250–345 kcal per meal on average. The summary is from MyNetDiary, a competitor, and the effect is corroborated by news coverage — [MyNetDiary](https://www.mynetdiary.com/how-accurate-is-ai-photo-food-logging.html); [Epocrates: AI calorie apps miss a third of meal calories](https://www.epocrates.com/online/article/ai-calorie-counting-apps-miss-a-third-of-meal-calories); [Deccan Herald](https://deccanherald.com/health/healthcare/photo-based-calorie-tracking-apps-may-underestimate-energy-in-meals-4087964)
- Comparison tables list voice logging for MyFitnessPal and chat/voice logging for newer AI trackers. No independent accuracy data exists for voice logging — [Welling: Cal AI vs MyFitnessPal 2026](https://www.welling.ai/articles/cal-ai-vs-myfitnesspal-2026)

**Safety / medical claims**
- Whoop's Blood Pressure Insights (beta, MG tier, needs cuff calibration) drew an FDA warning letter for marketing without authorization, and Whoop said it would not disable the feature. Whoop's terms say it is not a medical device and is not for pregnant users or people on BP medication — [TechRadar](https://www.techradar.com/health-fitness/smartwatches/whoop-unveils-two-brand-new-wearables-three-new-subscription-tiers); [BusinessWire press release](https://www.businesswire.com/news/home/20250508546933/en/WHOOP-Unveils-WHOOP%C2%AE-5.0-and-WHOOP%C2%AE-MG-Powerful-New-Devices-with-Breakthrough-Health-and-Longevity-Features)
- Google frames medical-record linking as making the coach's advice "safer" and positions the coach for doctor-visit preparation rather than diagnosis — [Google Blog 2026](https://blog.google/products-and-platforms/devices/fitbit/fitbit-personal-health-coach-updates-2026/)

### Inferences
- The baseline for a "coach" in 2026 is an LLM chat that reads the user's own logged data (training, nutrition, sleep, weight), plus proactive daily or "Today" messages and check-ins. A coach that only plans or answers generically sits below market standard.
- Bevel shows the winning pattern: commodity AI (photo food logging, workout-template generation) is free, while conversational coaching is paid and metered by credits to control LLM cost. This is a usable template for Myhealth.
- Photo logging is expected but inaccurate. Differentiation comes from honest uncertainty display (ranges, "please confirm portion"), quick corrections, and combining photo with barcode or database search.
- Apple has no full AI coach, which leaves a gap that iOS-first third-party apps can fill.

### Gaps
- No primary source found on "weekly AI review" formats (e.g. Whoop weekly or monthly reports) for 2026. Whoop Coach memory features were not found.
- No details found on how Oura or Whoop technically guardrail medical questions (refusal policies, escalation to doctors).
- No 2025–2026 primary info on Welltory AI features (search returned nothing).
- No German or EU availability data for the Google Gemini coach, Oura's women's-health LLM or Whoop Advanced Labs. Whoop Advanced Labs is US-only.

## Habit and behaviour: habits, streaks, notifications, mood/stress, cycle, supplements, hydration, steps

### Takeaway
The stickiest wellness apps use forgiving, game-like habit loops (Finch's virtual pet, no streak punishment) and widgets, not rigid streaks. Rigid streaks cause churn when they break. Platforms bundle sleep guidance, cycle tracking and women's health, and fasting apps bundle hydration and protein scores.

### Cited Findings
- Finch has an estimated ~10M MAU and D1/D7 retention of 54%/37%, compared with Duolingo's 51%/35%. These are third-party estimates, reportedly from Sensor Tower. Widgets are cited as "a critical driver of repeat user behavior" — [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl)
- In Finch, real self-care tasks (journaling, mood check-ins, breathing, reflections) grow a virtual bird. Streaks "never penalize missed days", and reviewers call this design shame-free. Critics note gamification fatigue and doubts about building intrinsic motivation — [HabitBox Finch review](https://habitbox.app/blog/finch-app-review); [WhistleOut review](https://www.whistleout.com/CellPhones/Apps/finch-self-care-app-review); [Alphonso Labs ADHD habit apps 2026](https://www.alphonsolabs.com/best-habit-tracker-apps-adhd-2026/amp/)
- The Streaks habit app (iOS/watchOS) automates progress via Apple Health and has Watch complications. Some users quit entirely after a streak reset — [Habi: Streaks alternatives](https://habi.app/insights/streaks-alternatives/)
- Hevy added streaks shown on profiles, including friends' streaks — [APKMirror Hevy release notes](https://www.apkmirror.com/?p=12942273)
- Samsung Bedtime Guidance recommends bedtimes from 3 days of sleep analysis — [Samsung Newsroom](https://news.samsung.com/us/?p=79410)
- Oura's women's-health LLM (Apr 2026) and Google's coach support for menopause show cycle and women's health becoming a coach topic — [Oura blog](https://ouraring.com/blog/oura-advisor/); [Google Blog](https://blog.google/products-and-platforms/devices/fitbit/fitbit-personal-health-coach-updates-2026/)
- Zero offers hydration tracking and a Protein Score. Fastic Plus offers daily challenges — [AppleVis Zero](https://applevis.com/apps/ios/health-fitness/zero-fasting-health-tracker); [Editorialge](https://editorialge.com/best-intermittent-fasting-apps/)
- Bitkom Digital Health 2025 (n=1,145): 64% of app users said apps helped them optimize their training, and ~14% feel frequently pressured by such apps. The slide mapping is unclear, so verify before quoting — [Bitkom presentation Digital Health 2025](https://www.bitkom.org/sites/main/files/2025-11/bitkom-praesentation-digital-health-2025.pdf)
- In Germany, women's-health apps can cross into medical-device territory depending on intended purpose (CMS analysis) — [CMS: Women's Health – Lifestyle-Tool oder Medizinprodukt?](https://cms.law/de/deu/legal-updates/women-s-health-noch-lifestyle-tool-oder-schon-medizinprodukt)

### Inferences
- For Myhealth, a forgiving streak (rest days count, "streak freeze", weekly targets instead of daily) is lower-risk than strict daily streaks. The Bitkom "pressure" figure supports avoiding guilt-driven notifications.
- Cross-cutting daily micro-habits (water, steps, protein target, supplements/creatine, sleep time) give an all-in-one app the "multiple reasons to open daily" that Finch analyses credit for retention.
- Cycle tracking is high-value but legally sensitive in the EU. It can be read-only (from HealthKit or Health Connect) to adjust training load, without fertility or contraception claims.

### Gaps
- No primary 2025–2026 data on notification strategies (frequency or timing benchmarks) for health apps.
- No sourced data on supplement or medication reminder adoption, NEAT features, or mindfulness/breathing usage in all-in-one apps.

## Body metrics: weight trends, body fat, measurements, photos, scales, biomarkers, BP, CGM

### Takeaway
Leading platforms are moving from weight and steps toward biomarkers: lab uploads (Whoop Advanced Labs with 65 biomarkers, Bevel Health Records), CGM integration via Health Connect (Google), blood pressure (Whoop MG, contested) and novel sensors (Samsung Antioxidant Index, Vascular Load). "Biological age" is a popular paid hook.

### Cited Findings
- Whoop members can upload prior lab results free, integrating 65 biomarkers with continuous data and AI coaching. Paid panels cost $199, $349 or $599 per year, or $299 for specialized panels. US-only, 18+, not pregnant — [Whoop Membership](https://whoop.com/us/en/membership/); [Whoop: Everything launched in 2025](https://www.whoop.com/us/en/thelocker/everything-whoop-launched-in-2025/)
- Whoop 5.0/MG (May 2025) added on-demand ECG and Blood Pressure Insights (beta) with healthspan and longevity features — [BusinessWire](https://www.businesswire.com/news/home/20250508546933/en/WHOOP-Unveils-WHOOP%C2%AE-5.0-and-WHOOP%C2%AE-MG-Powerful-New-Devices-with-Breakthrough-Health-and-Longevity-Features); [Business Today](https://www.businesstoday.in/amp/technology/news/story/whoop-introduces-two-new-wearables-whoop-50-and-whoop-mg-with-on-demand-ecg-blood-pressure-tracking-475572-2025-05-09)
- Bevel Pro includes Biological Age and Health Records (lab and bloodwork import). Bevel also connects to Oura, Garmin and Google Health as an interpretation layer — [Gadgets & Wearables](https://gadgetsandwearables.com/2025/12/21/bevel-app-free/); [Healify comparison](https://www.healify.ai/blog/best-ai-health-coach-apps-2026)
- Google: CGM via Health Connect plus medical records in the coach — [Google Blog 2026](https://blog.google/products-and-platforms/devices/fitbit/fitbit-personal-health-coach-updates-2026/)
- Samsung: the Antioxidant Index (skin carotenoids via thumb sensor) and Vascular Load (sleep-time vascular stress) started as "Labs" features, with trend charts added in 2026 — [Samsung Global](https://news.samsung.com/global/galaxy-unpacked-2025-a-first-look-at-the-galaxy-watch8-series-streamlining-sleep-exercise-and-everything-in-between); [Samsung UAE app page](https://www.samsung.com/ae/apps/samsung-health/)

### Inferences
- For a training-focused all-in-one app, the realistic additions are: a smoothed weight trend (EMA, as in MacroFactor or Happy Scale; not sourced here), measurements, progress photos with side-by-side or overlay comparison, smart-scale sync via HealthKit or Health Connect, and manual lab-value entry with trend charts. A lab feature must stay descriptive to avoid MDR issues.
- Avoid "biological age" or BP interpretation claims in Germany: the Whoop FDA case shows the regulatory risk of quasi-medical outputs.

### Gaps
- Did not find 2025–2026 primary sources on progress-photo overlay features, body-fat estimation from photos, or smoothed-weight-trend features in the named apps. A separate nutrition or body-tracking researcher may cover this.
- No data on German availability of CGM (e.g. Abbott Lingo or Dexcom Stelo) for non-diabetics in 2026.

## Engagement: onboarding, goals, challenges, social, human coaching, content

### Takeaway
Integrated programs (Noom, WW, Freeletics) combine personalized onboarding questionnaires, structured plans and educational content. In 2025–2026 the US weight-loss players pivoted hard to GLP-1 companion offerings. Social feeds and friend streaks (Hevy) and daily challenges (Fastic) are common engagement levers. In Germany, DiGA (Oviva, zanadio) embed human or medical coaching paid by health insurers.

### Cited Findings
- Noom runs a "Microdose GLP-1" program, reportedly starting at $79–$119 per month for the first month depending on source. Its GLP-1 Companion includes protein tracking, "Muscle Defense" workout videos and high-protein recipes — [Fierce Healthcare](https://www.fiercehealthcare.com/digital-health/noom-offer-compounded-glp-1-drug-rival-pricey-branded-weight-loss-meds); [Noom plans](https://www.noom.com/plans); [Nutrition Insight](https://nutritioninsight.com/news/noom-upgrades-glp-1-weight-management-app-features-as-digital-therapeutics-gain-us-market-traction.html)
- WW is described as "mid-pivot toward medical weight care" (points plan, workshops, GLP-1). This comes from a secondary review blog — [Unstar ranking (search summary)](https://unstar.app/blog/noom-weightwatchers-myfitnesspal-lose-it-found-weight-loss-apps-ranked-2026)
- Freeletics uses an intake assessment that leads to a weekly AI schedule, with a 14-day money-back guarantee — [ConsumerAffairs](https://www.consumeraffairs.com/health/freeletics.html)
- Hevy has a social feed, followers, sharing and a web app. Strong has no feed (share links only) and no web app — [Setgraph Hevy vs Strong 2026](https://setgraph.app/articles/hevy-vs-strong-app-comparison-2026)
- DiGA: Oviva and zanadio (obesity) are permanently listed in the BfArM directory based on evidence (PTA Heute, March 2026). Oviva started at a manufacturer price of €445, with a current reimbursement price of €218.70 according to AOK. zanadio cost insurers €26.2M and ranks among the most expensive DiGA. The average DiGA cost is €226 per quarter (DiGA-Report 2025) — [PTA Heute](https://www.ptaheute.de/aktuelles/2026/03/04/diga-bei-adipositas-lebensstilintervention-mit-evidenz); [AOK Daten und Analysen](https://www.aok.de/pp/gg/daten-und-analysen/digitale-gesundheitsanwendungen/); [Ärzte Zeitung](https://www.aerztezeitung.de/Wirtschaft/DiGA-fuer-Diabetes-und-Adipositas-gefragt-423798.html)
- Insurers criticize the high costs and low benefits of prescription apps — [heise](https://heise.de/-10375339)

### Inferences
- In Germany the GLP-1 trend is relevant even without telemedicine: a "GLP-1 mode" (protein priority, muscle-preservation strength training, side-effect and appetite log, lean-mass tracking) fits Myhealth's training plus nutrition core and is low-regulatory if purely lifestyle.
- A human-coach marketplace is not typical among the named consumer apps. In Germany human coaching is mostly delivered via DiGA (insurer-paid) or Freeletics-style programs. An "export report for my trainer or doctor" is a lighter alternative.

### Gaps
- No sourced data on achievements, badges or challenge efficacy for retention in health apps in 2025–2026.
- No German euro prices found for Noom or WW.
- No data on accountability-partner features.

## Platform: widgets, Live Activities, Watch/Wear OS, Siri/Shortcuts, HealthKit/Health Connect, export, sync, web, offline

### Takeaway
Health Connect (Android) and HealthKit are the integration backbone. Google even routes CGM data through Health Connect, and Bevel positions itself as an aggregation layer over Oura, Garmin and Google. Strong Watch apps, a web app and free CSV export are credible differentiators in the training-tracker segment. Widgets are documented as a retention driver.

### Cited Findings
- Google connects CGM data via Health Connect to the Gemini coach — [Google Blog 2026](https://blog.google/products-and-platforms/devices/fitbit/fitbit-personal-health-coach-updates-2026/)
- Bevel integrates with Oura, Garmin and Google Health — [Healify comparison](https://www.healify.ai/blog/best-ai-health-coach-apps-2026)
- Bevel Strength Builder: 700+ exercises, workout sync between watch and phone, real-time muscular-strain feedback, rest timers, progression history and "Auto Update Template" — [App Store: Bevel](https://apps.apple.com/us/app/bevel-all-in-one-health-app/id6456176249); [Releasebot Bevel notes](https://releasebot.io/updates/bevel-health)
- Strong's Watch app lets users log whole sessions without the phone and is reviewed as more polished than Hevy's. Both offer CSV export on all plans including free — [Setgraph](https://setgraph.app/ai-blog/hevy-vs-strong); [Setgraph 2026](https://setgraph.app/articles/hevy-vs-strong-app-comparison-2026)
- Finch: widgets are a key repeat-use driver — [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl)
- Workout Buddy requires a nearby Apple Intelligence iPhone, so on-device AI has hardware limits — [Apple Support](https://support.apple.com/en-us/123002)

### Inferences
- Minimum platform parity for Myhealth: HealthKit and Health Connect read+write (workouts, weight, body fat, nutrition, water), home and lock-screen widgets (today's macros, next workout, streak), a Live Activity or Dynamic Island for the rest timer during workouts, a Watch companion for set logging, App Intents/Shortcuts ("log water", "start workout"), and free CSV/JSON export.

### Gaps
- No sourced 2025–2026 data on Live Activities, App Intents or Siri adoption in health apps, or on Health Connect write support in Hevy or Strong.
- No sourced info on offline-first, accessibility or localization practices.

## Privacy, trust and regulation (DSGVO/GDPR, MDR, DiGA, ePA)

### Takeaway
A general fitness or nutrition coach usually falls outside the EU MDR as long as its intended purpose is lifestyle and wellbeing (MDR recital 19). Diagnostic or treatment claims, disease-specific analysis and recommendations, or risk predictions can make it medical-device software under Rule 11. The ePA (electronic patient record) has low uptake and no fitness-app data interface, so ePA integration is not a realistic 2026 feature.

### Cited Findings
- MDR classification follows the manufacturer's intended purpose. Recital 19 says software for lifestyle and wellbeing is not a medical device. An app marketed as diagnostic becomes one. A VDE example: an app that analyses data and prescribes exercises to support disease treatment was classified as a medical device — [DQS](https://www.dqsglobal.com/de/entdecken/wiki/wie-wird-software-zum-medizinprodukt-und-wie-kommt-sie-zur-mdr-zertifizierung); [VDE: Medizinische Software und Apps](https://www.vde.com/topics-de/health/beratung/medizinische-software-und-medical-apps); [Mason Hayes & Curran](https://mhc.ie/latest/insights/health-and-fitness-apps-v-medical-devices)
- MDCG 2019-11 Rev.1 (June 2025) clarifies qualification and emphasizes a clear intended purpose and modular software, where only some modules may qualify. On 16 Dec 2025 the EU Commission proposed an amendment to Rule 11; its status is unclear — [Pure Global](https://www.pureglobal.com/de/news/mdcg-guidance-documents-clarify-rules-on-medical-device-software-in-the-eu); [NAMSA](https://namsa.com/de/resources/blog/mdr-stricter-rules-medical-device-software/)
- Swiss FMH FAQ: sport, fitness, wellness and nutrition apps often do not qualify as medical-device software — [FMH FAQ](https://contens30.fmh.ch/files/pdf27/faq-software-as-a-medical-device-dt.pdf)
- DiGA are certified medical devices with a BfArM evidence process. Rödl (Nov 2025) explains DiGA as medical devices — [Rödl & Partner](https://www.roedl.com/insights/diga-als-medizinprodukt/)
- ePA: since 1 July 2026 insurer ePA apps are gradually getting push notifications and the option to hide documents. Only 5.85M insured persons actively use the ePA. Users can upload their own documents via the insurer app. No interface for fitness-app data was found — [apotheke adhoc](https://www.apotheke-adhoc.de/nachrichten/detail/e-health/epa-push-funktion-und-volltextsuche-kommen/); [fitbook gematik interview](https://www.fitbook.de/gesundheit/gematik-epa-interview); [GKV-Spitzenverband ePA](https://www.gkv-spitzenverband.de/service/elektronische_patientenakte_epa/epa_infos.jsp)
- German data-protection authorities have repeatedly called for more privacy protection for wearables and health apps. An older ministry-commissioned study found 39% saw third-party data use as a problem (older data, ~2016) — [Ärzteblatt](https://www.aerzteblatt.de/archiv/174975/Fitness-Tracker-Der-Datenhunger-waechst); [Ärzte Zeitung: Datenhüter geben Spielregeln vor](https://www.aerztezeitung.de/Wirtschaft/Datenhueter-geben-fuenf-Spielregeln-vor-292953.html)
- Older Bitkom data (~2016): a third of Germans record health data with trackers or apps, and three quarters would share tracker data with their doctor if ill — [iphone-ticker](https://www.iphone-ticker.de/jeder-dritte-deutsche-nutzt-fitness-tracker-und-apps-92607/)

### Inferences
- The Myhealth AI coach should have a written intended purpose ("lifestyle, training and nutrition; no diagnosis or therapy"), refuse disease-specific treatment advice, and refer users to a doctor. It should keep any lab or BP module descriptive (display and trend only).
- Trust levers likely to resonate in Germany: EU hosting, clear consent per data type (Art. 9 GDPR special-category health data), local-only or "AI off" options, transparent LLM provider disclosure and one-tap data export or deletion. These are inferred; no 2025–2026 German survey was found that ranks them.
- A "doctor PDF report" (weight, BP, training summary) that users can upload to their ePA themselves is the realistic ePA-adjacent feature.

### Gaps
- No 2025–2026 German survey on what users value in health-app privacy (local storage, EU servers) was found. The Bitkom 2025 deck covers digital health but specific privacy figures were not extractable.
- Not researched: HWG/Health Claims Regulation rules for app marketing, or EU AI Act obligations for wellness coaches. The AI Act was not covered by the sources found.

## Monetization models and prices (Germany)

### Takeaway
Health and fitness is the strongest subscription category per install. Annual plans dominate (~60% of revenue) and trials lift LTV. Typical anchors are ~$9.99/month and ~$39.99/year (category median). Premium AI or wearable-linked apps charge $70–100/year. In Germany, Yazio PRO is ~€30–50 per year and Freeletics ~€80 per year.

### Cited Findings
- RevenueCat SOSA 2026: Health & Fitness has the highest revenue per install at D14 ($0.48) and D60 ($0.66). Median realized LTV per payer is $24.23 after 1 month and $35.64 after 1 year. Prices cluster at $9.99/month and $39.94/year — [RevenueCat State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps)
- Annual plans make up 60.6% of Health & Fitness revenue, the exception to the weekly-plan trend. Trial users have +63.6% LTV versus direct buyers (secondary summaries of the RevenueCat report) — [Airbridge 2026 benchmarks](https://www.airbridge.io/en/blog/subscription-app-pricing-by-category-2026-benchmark); [ARPU Brothers](https://arpubrothers.com/blog/revenuecat-subscription-app-report-2026/)
- The median annual renewal rate for the category is 25% (IQR 16–37%) — [RevenueCat renewal rates](https://www.revenuecat.com/blog/growth/average-subscription-renewal-rates-by-app-category). This conflicts with an "86.4% yearly retention" figure on the SOSA page, likely a different metric.
- Median trial-to-paid conversion is 37.7% (top quartile >51.4%), from a secondary source — [Sahha](https://sahha.ai/blog/health-app-monetization-first-month/)
- Yazio PRO: ~€49.99/year according to GIGA. Other sources cite €29.99–39.99/year, and Yazio says "from under €4 per month". Germans use Turkish App Store pricing hacks (~€4–8 per year), which signals price sensitivity — [GIGA](https://www.giga.de/artikel/yazio-welche-kosten-gibt-es-was-gibt-es-kostenlos/); [mydealz](https://www.mydealz.de/deals/yazio-pro-jahresabo-fur-533eur-300-try-turkischer-appstore-2836845)
- Freeletics: EU reference price €39.99 for 12 weeks of Coach and €79.99 for 12 months of Coach Premium (aggregator). US ~$99.99/year. Personalized plans "from $2.21/week" — [Subger](https://subger.com/en/service/freeletics); [ConsumerAffairs](https://www.consumeraffairs.com/health/freeletics.html)
- Bevel: free core, Pro at $14.99/month or $99.99/year with metered AI. Oura membership: $5.99/month or $69.99/year. Fastic Plus: ~$11.99/month — [Gadgets & Wearables](https://gadgetsandwearables.com/2025/12/21/bevel-app-free/); [Oura blog](https://ouraring.com/blog/oura-advisor/); [Editorialge](https://editorialge.com/best-intermittent-fasting-apps/)
- Whoop moved to three membership tiers with key features behind higher tiers, which was criticized ("best features hidden behind a paywall") — [TechRadar](https://www.techradar.com/health-fitness/smartwatches/whoop-unveils-two-brand-new-wearables-three-new-subscription-tiers)

### Inferences
- For Myhealth in Germany, a plausible bracket is €4–7 per month on an annual plan (~€40–60 per year), with a trial. Optional lifetime purchases may appeal to subscription-fatigued users. No source on lifetime-purchase performance was found.
- Bevel's free-core, paid-AI split addresses the "paywall" complaint while monetizing the costly LLM part.

### Gaps
- No data found on lifetime-purchase conversion or revenue share in health apps.
- No reliable German euro prices for Noom, WW, Fastic, Oura or Whoop.

## Top user complaints and wishes for all-in-one apps

### Takeaway
The most consistent complaints are subscription pricing and free-tier limits, hard-to-cancel trials, and features moved behind paywalls (Whoop tiers). Feature bloat and complexity are a secondary complaint, at around 10% of negative reviews in one vendor analysis. Users want consolidation, with fewer apps and subscriptions.

### Cited Findings
- An app-review analytics vendor ranks subscription pricing and free-tier limits near the top of health and fitness complaints, and complex UI or feature bloat lower (~10%). This comes from a search summary; the page could not be fetched and the figures are not independently verified — [Unstar: What users really want 2026](https://unstar.app/blog/health-fitness-app-reviews-what-users-really-want-2026)
- Frequent Reddit complaints centre on subscription models and hard-to-cancel trials (example: BetterMe; low-quality summary page) — [Cal Poly-hosted summary](https://grandavehousing.calpoly.edu/news/better-me-world-reviews-what)
- Subscription fatigue now extends beyond streaming into fitness apps — [Adapty glossary](https://adapty.io/glossary/subscription-fatigue/); [Android Headlines 2025](https://www.androidheadlines.com/2025/05/breaking-up-with-your-apps-what-soaring-subscription-cancellation-trends-reveal-about-consumer-habits)
- 78% of respondents "dream of a single app" to manage their digital footprint (Bango, 2022, not fitness-specific, older) — [The Drum](https://www.thedrum.com/news/2022/11/16/us-subscription-fatigue-real-with-consumers-managing-average-5-accounts)
- Whoop's Coach is criticized as siloed to Whoop data, showing that users want a coach that sees nutrition, labs and mood together — [Ness Health comparison](https://ness-health.com/blog/ai-health-coaches-compared)
- Streak resets lead some users to abandon habit apps — [Habi](https://habi.app/insights/streaks-alternatives/)
- Photo AI underestimates calories by roughly 250–345 kcal per meal, which drives trust issues — [MyNetDiary/NIH](https://www.mynetdiary.com/how-accurate-is-ai-photo-food-logging.html)
- Sensor Tower notes fitness apps need engagement and usage strength, not just downloads — [Sensor Tower](https://sensortower.com/blog/fitness-apps-need-engagement-and-usage-strength)

### Inferences
- Myhealth's all-in-one positioning answers subscription stacking if it replaces 2–3 apps (training logger, calorie tracker, weight or progress app) at one price. It should avoid bloat via progressive disclosure: modules users can switch on or off.
- The key all-in-one wish is a single coach that reasons across training, nutrition, weight, sleep and steps. That is exactly where single-device coaches (Whoop) are criticized.

### Gaps
- No direct Reddit threads from 2025–2026 about bloat in all-in-one fitness apps were retrieved. A targeted search in r/Fitness, r/loseit or r/MacroFactor is still needed.
- No German-language app-store complaint analysis was found.
