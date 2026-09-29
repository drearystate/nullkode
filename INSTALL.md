# Install Nullkode

Follow [START-HERE.md](START-HERE.md) for the guided Docker setup on Windows, macOS, or Linux, then configure your brand, AI, and optional customer billing in the browser.

The package includes all platform source. No separate proprietary backend or paid Nullkode account is required. Optional external services and local models use your own accounts and hardware.

On a server with a domain name, the installer also sets up HTTPS by itself: answer `y` to "Do you have a domain name for this server?", or run `NULLKODE_DOMAIN=studio.example.com bash install.sh`. Free Let's Encrypt certificates are made and renewed automatically for your studio, your customers' verified domains, reseller domains and, if you choose, each app's own address (`NULLKODE_APPS_DOMAIN=apps.example.com`). It needs ports 80 and 443 and one or two DNS records, which the installer shows. See [Put it on a public domain](START-HERE.md#put-it-on-a-public-domain-automatic-https). Without a domain name, Nullkode runs on plain `http://localhost:3001` as before.

The installer also offers optional Android APK building. It adds about 1.1 GB and Google's Android SDK, which means accepting Google's Android SDK License. Turn it on by answering `y`, or run `NULLKODE_ANDROID=1 bash install.sh`. See [Build Android apps](START-HERE.md#build-android-apps-optional).

For source layout see [ARCHITECTURE.md](ARCHITECTURE.md). For recovery see [docs/deploy/RESTORE.md](docs/deploy/RESTORE.md).
