# WinWitget

Windows için modern, hafif ve şık bir masaüstü hava durumu widget'ı.

![sürüm](https://img.shields.io/github/v/release/fndacil-create/WinWitget)
![lisans](https://img.shields.io/github/license/fndacil-create/WinWitget)
![platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue)

İstanbul'daki hava 19°C mi? Ankara 4 saat içinde yağacak mı? Antalya'da UV 8 mi? Hepsini ekranının sağ köşesinde, tek bakışta gör.

---

## Özellikler

- **Anlık + 15 günlük tahmin** — şu anki sıcaklık, hissedilen, koşul, UV, nem, rüzgar, AQI, gün doğumu/batımı
- **8 saatlik detaylı tahmin** — sıcaklık ve yağış olasılığı
- **Çoklu şehir desteği** — en fazla 10 şehir kaydet, sekmelerle arasında anlık geçiş yap
- **Akıllı sıcaklık göstergesi** — sıcaklık rakamı, değere göre renk değiştirir (soğukta mavi, sıcakta turuncu, aşırı sıcakta kırmızı + parıltı efekti)
- **Akıllı uyarı çubuğu** — `🔥 Aşırı sıcak — gölgede kal`, `☀️ Yüksek UV — güneş kremi sür`, `☂️ 1 saat içinde yağmur`, `💧 Bunaltıcı — su iç` gibi bağlamsal öneriler
- **Windows bildirimleri** — yağmur, fırtına, aşırı sıcak/soğuk, şemsiye hatırlatıcısı
- **Otomatik konum** — IP'den şehrini otomatik tespit eder, istersen manuel şehir seç
- **3 boyut + opaklık ayarı** — küçük/orta/büyük, %70-100 saydamlık
- **Koyu/Açık/Sistem teması** — Windows temasıyla otomatik uyum
- **Kompakt mod** — sadece sıcaklık ve ikon gösterir, daha az yer kaplar
- **Sistem tepsisi** — kapatma yerine tepsiye küçülür, çift tıkla göster/gizle
- **Klavye kısayolu** — `Ctrl + Shift + W` ile hızlı göster/gizle
- **Pil dostu mod** — pilde 15 dk, prizdeki 5 dk güncelleme
- **Çevrimdışı önbellek** — internet yokken son veriyi göster
- **Otomatik güncelleme** — yeni sürüm çıktığında arka planda iner, restart'ta kurulur

## İndir

En son sürümü buradan indir: **[Releases](https://github.com/fndacil-create/WinWitget/releases/latest)**

İndirilecek dosya: `WinWitget Setup X.Y.Z.exe` (~92 MB). Çift tıkla → kurulum sihirbazına izin ver → kur.

### Sistem gereksinimleri

- Windows 10 veya Windows 11 (x64)
- ~150 MB disk alanı
- İnternet bağlantısı (hava durumu için)

> Windows SmartScreen "bilinmeyen yayıncı" uyarısı verirse: **Daha fazla bilgi → Yine de çalıştır**. Uygulama henüz kod imzalı değil ama açık kaynak — kodu kendin kontrol edebilirsin.

## Kullanım

1. Kurulumdan sonra WinWitget açılır, ekranın sağ üst köşesinde durur.
2. **Sürükle**: pencerenin üst kısmından tutup istediğin yere taşı.
3. **Ayarlar**: ⚙ ikonuna tıkla → şehir ekle, tema/boyut/bildirimleri ayarla.
4. **Kompakt mod**: ▭ ikonuna tıkla → sadece sıcaklık ve hava ikonu görünür.
5. **Yenile**: ⟳ ikonuna tıkla → hava verisini anında güncelle.
6. **Kapat**: × ikonu pencereyi tepsiye küçültür. Sağ tıklamayla "Çıkış" tam kapatır.

## Veri kaynağı

- Hava durumu: [Open-Meteo](https://open-meteo.com/) (ücretsiz, açık kaynak, API anahtarı gerektirmez)
- Hava kalitesi: [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api)
- Şehir arama: [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api)
- Konum tespiti: [ipapi.co](https://ipapi.co/)

## Geliştirme

Kaynak kodu klonlamak ve geliştirmek istersen:

```powershell
git clone https://github.com/fndacil-create/WinWitget.git
cd WinWitget
npm install
npm start
```

### Yapı

- **Electron 35** — uygulama çerçevesi
- **Vanilla JS + HTML/CSS** — renderer (framework yok, hafif)
- **electron-builder** — Windows installer paketleme
- **electron-updater** — otomatik güncelleme

### Klasör yapısı

```
WinWitget/
├── main.js                 # Electron main process, IPC handler'lar
├── preload.js              # Renderer'a açılan güvenli API
├── settings.js             # Ayar kaydetme/yükleme
├── weatherService.js       # Open-Meteo API çağrıları
├── trayIcon.js             # Sistem tepsisi ikon mantığı
├── windowShape.js          # Yuvarlatılmış pencere maskeleme
├── cache.js                # Çevrimdışı önbellek
├── renderer/
│   ├── index.html
│   ├── app.js              # UI mantığı, renderer process
│   ├── style.css
│   ├── weather.js          # Format yardımcıları (sıcaklık, tarih)
│   ├── weather-icons.js    # Hava kodu → ikon eşlemesi
│   └── icons/              # 3D hava durumu ikonları (PNG)
├── assets/                 # Tray ikonu vs.
└── scripts/                # İkon üretim yardımcıları
```

### Yayınlama (proje sahibi için)

Yeni sürüm yayınlamak çok basit:

1. Kodda değişiklik yap, test et (`npm start`)
2. `Yayinla.bat`'a çift tıkla
3. Sürüm türünü seç (1: bug fix, 2: yeni özellik, 3: büyük değişiklik)
4. Commit mesajı yaz → Enter
5. Otomatik: versiyon yükseltme + git push + GitHub Releases'a yükleme

Detay için: `Yayinla.bat`'ın içine bak veya geliştirme dökümanına bak.

## Lisans

[MIT](LICENSE) — Özgürce kullanabilir, değiştirebilir, dağıtabilirsin.

## Katkı

Bug bulursan veya öneri varsa: [Issues](https://github.com/fndacil-create/WinWitget/issues) sekmesinden bildir.

---

Open-Meteo'ya ücretsiz, kaliteli hava verisi için teşekkürler.
