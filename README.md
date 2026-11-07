# OdivonFireSafe

Odivon'un F‑Gas uyumluluk ve saha operasyonu ürünüdür. Angular 22, Signals, Tailwind CSS 4 ve Odivon UI Design System ile geliştirilir.

## Yerel geliştirme

```bash
npm install
npm start
```

MainAPI adresi ve Firebase web istemci ayarları `src/environments/environment.ts` içinde yerel/deployment ortamına göre sağlanır. Bu repoya service-account veya production credential eklenmez.

## Doğrulama

```bash
npm run typecheck
npm test -- --watch=false
npm run build
```

İş verisi yalnız `/api/v1/fire-safe` MainAPI alanından alınır. Firebase yalnız Auth ve App Check için kullanılır.

## Sürümleme

Her build öncesinde `scripts/write-version.mjs` çalışır ve sürümü commit'ten üretir:

- Sürüm `MAJOR.MINOR.<commit sayısı>` biçimindedir (ör. `1.0.13`). Major/minor `package.json` içinden gelir; her yeni commit son sayıyı bir artırır. `APP_VERSION` ortam değişkeni sürümü ezer.
- `buildId` = `<sürüm>-<kısa commit>`; aynı commit yeniden build edilince değişmez.
- Sürüm `public/version.json` dosyasına ve uygulamaya (`BUILD_INFO`) yazılır, yan menünün altında görünür ve API'ye `X-Client-Version` başlığıyla gider.

Yeni sürüm yayınlandığında:

- Açık sekmeler `version.json` dosyasını 5 dakikada bir (ve sekmeye dönüldüğünde) kontrol eder, güncelleme penceresini gösterir.
- Tarayıcı farklı bir build ile açıldığında, uygulama başlamadan önce çerezler, localStorage/sessionStorage, IndexedDB (Firebase oturumu), Cache Storage ve service worker'lar temizlenir ve kullanıcı `/login` sayfasına yönlendirilir. Tema ve dil tercihleri korunur.

## Lisans

Bu projeye açık kaynak lisansı verilmemiştir. Tüm hakları saklıdır.
