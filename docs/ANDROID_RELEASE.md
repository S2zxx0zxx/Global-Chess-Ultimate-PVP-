# PWA and Android release architecture

The web client is React + TypeScript + Vite using chess.js. It can be deployed as a static PWA over HTTPS. Android packaging should use a Trusted Web Activity (TWA) through Bubblewrap for one shared web codebase, or Capacitor if future native integrations warrant it. A native Android project can contain generated Java/Kotlin build scaffolding without the game itself being authored in Java/Kotlin.

Before creating an AAB: secure an HTTPS domain you control, deploy & validate the PWA, generate 192x192/512x512 **raster** and maskable launcher icons, configure Digital Asset Links with the real Play signing certificate, set correct app/package ID, generate signing keys outside source control, configure Android SDK/JDK and Bubblewrap/Gradle, validate offline/error behavior, sign release AAB, and run Play Console internal testing on physical Android devices.

Do not invent a certificate fingerprint, website origin, Play package ID, signing key, install metric or release readiness. This repository does not yet produce a signed AAB.
