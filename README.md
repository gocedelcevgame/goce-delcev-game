# Патот на Слободата — Гоце Делчев

**WPA Historical Adventures** — интерактивна историска образовна авантура за деца и семејства.

- **Верзија:** v2.5.7 (9 ноември 2026) — тест-кандидат, не потврден live; продажбата НЕ е одобрена.
- **37 нивоа** со играчки задачи, знаење и предизвици.
- **Јазици:** MK, EN (англиската содржина е пилотска и потребна е редакциска проверка).
- **Уреди:** компјутери, лаптопи, телефони и таблети преку прелистувач; опционална PWA.
- **Дополнително:** локален напредок, сертификат за лична употреба, наставничка работна страна и мини-игра „Протокол на времето“.
- **Музика:** вграден Suno AI soundtrack како наведено во MUSIC_PROVENANCE.md; комерцијално потекло под проверка.
- **Плаќање:** НЕ е активирано; нема Stripe, PayPal, плаќање со картичка или платен пристап.

## Како да се отвори

Игра: `index.html` преку HTTPS веб-хостинг или локален HTTP сервер.
Наставничка страна: `teacher.html` · сертификат: `certificate.html` · мини-игра: `crossover.html`.

## GitHub Pages

Содржината на овој директориум оди во **root** на [gocedelcevgame/goce-delcev-game](https://github.com/gocedelcevgame/goce-delcev-game).
За првото ажурирање употреби нова гранка и pull request, па откако ќе се провери, merge во `main`.
Live (старо издание додека не се потврди merge): https://gocedelcevgame.github.io/goce-delcev-game/

GitHub 2FA е заштита за најавување на сметката, не грешка во кодот на играта.

## Cloudflare Pages

Може да се користи истата статична структура, со build output `.` и без build command.
За одделни игри одделни Cloudflare Pages проекти.

## Правен статус

Авторско/образовно пилот-издание. Не е официјално акредитирана програма.
Правата и дозволите се опишани во `LICENSE.txt`, `THIRD_PARTY_NOTICES.md` и `MUSIC_PROVENANCE.md`.
Нема гаранција за App Store/Google Play издание или проверка на физички TV.

## Cinematic depth foundation (2.5.6, 9 Nov 2026)
This candidate adds **2.5D visual parallax** without changing the 37 levels or physics. It is **not real-time polygonal 3D**, not yet deployed, and **not cleared for commercial sale**. See VISUAL_DEPTH_NOTES.md.

## Живи историски светови / Living historical worlds

- Декоративни градини, дрвја, цветни патеки, фонтани, птици и пеперутки — избор според историјата и географијата на нивото. / Level-aware gardens, birds, butterflies and water.
- 4 локално создадени синтетички аудио-пејзажи: птици, поток, ветер и ноќни инсекти; **не се реални снимки од славејчиња**. / Original algorithmic ambience, not real bird recordings.
- Природниот звук е **исклучен по правило** и почнува само по кориснички избор и влегување во игра. / Off by default, only after user opt-in.
- Копчињата Природа, Движење и гласност се независни од постојниот soundtrack. / Independent nature, motion and volume controls.
- Нема нови API, tracking, analytics, реклами, платежни токени, physics collisions или дополнителни library dependencies. / No new services or collision rules.
- Уредничка веродостојност: амбиентите се стилизирани интерпретации, не археолошки реконструкции. / Stylized interpretations, not historically validated reconstructions.
- Надградбата е release candidate; продажба и јавно поставување не се извршени.
