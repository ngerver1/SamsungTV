# Put Serif Home on your TV

Written for **Samsung The Serif QA55LS01DAWXXY (LS01D, 2024)** on firmware **T-PTMDUABC-0090-2130.0**.

That firmware string is identical to the one on [CleanFrame](https://github.com/nthnclrk/CleanFrame)'s reference TV, a 2024 Frame (QA55LS03DAWXXY). The Frame and the Serif share this firmware family, so CleanFrame's tested results are the closest evidence available: Tizen 9.0 on 32-bit ARM, Developer Mode via `12345`, official SDK signing, and installation via `vd_appinstall`. The Serif itself has not been tested yet. Treat each stage as a check, and write down what you see.

> **Use at your own risk.** Stages 1–6 install an ordinary app using Samsung's own developer tools. They don't change the TV's firmware, Home button or startup behaviour. Removing the app puts things back as they were.

## What you need

- The TV, its remote, and a computer (macOS, Windows or Linux) on the **same home network**.
- A free **Samsung account**, used to create your signing certificates.
- **Tizen Studio** from Samsung (free), **Python 3.10+** and **Node.js 22+**. Run `npm ci` once in this folder. Each `npm run tv:…` command is a shortcut for a Python script listed in `package.json`, so you can also run those scripts directly.
- About an hour the first time.

Your private settings go in a `.local/` folder in this repo. Git ignores that folder, so it is never committed.

## Stage 1 — Note the TV's details

You already have these:

| Item | Value |
| --- | --- |
| Model code | QA55LS01DAWXXY |
| Software version | T-PTMDUABC-0090-2130.0 |

**Check the model code.** `QA55…` is the 55-inch Serif. A 65-inch Serif would start `QA65…`. Look at **Settings → Support → About This TV** again. Either way, the firmware is what matters for this guide.

**TV IP address:** **Settings → All Settings → Connection (or General & Privacy) → Network → Network Status → IP Settings**. Write down the **IP address**, for example `192.168.1.50`.

**Computer IP address:**
- macOS: **System Settings → Wi-Fi → Details → IP address**, or run `ipconfig getifaddr en0`.
- Windows: run `ipconfig` and use the IPv4 address of your Wi-Fi or Ethernet adapter.
- Linux: run `ip route get 1.1.1.1` and use the address after `src`.

Turn off any VPN on the computer while you do this.

> **Tip:** In your router, give the TV and the computer a reserved (static) IP address so these don't change later.

## Stage 2 — Turn on Developer Mode

1. Press **Home** on the remote and open **Apps**.
2. Open the **number pad**. On the 2024 Solar Cell remote, press the **123 / colour** button until the number pad appears on screen.
3. Enter **1 2 3 4 5**. The **Developer Mode** window opens.
4. Set **Developer mode** to **On**. Under **Host PC IP**, enter the **computer's IP address** from Stage 1, then select **OK**.
5. **Power-cycle the TV at the wall.** Switch it off at the power point, wait 10 seconds, then switch it back on. A normal Power-button press on this TV family can just enter standby or Ambient Mode, which isn't enough. CleanFrame's reference TV only accepted connections after a full power cycle.
6. Open **Apps** again. You should see **Developer Mode** at the top of the screen.

## Stage 3 — Install Samsung's tools and connect

1. Install **Tizen Studio** from [Samsung's TV SDK page](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html). Choose a folder whose path has **no spaces**, such as `~/tizen-studio` or `C:\tizen-studio`.
2. Open **Package Manager**, which comes with Tizen Studio. Under **Extension SDK**, install **Samsung Certificate Extension** and the latest **TV Extensions**.
3. In this repo, create the private settings folder and files:

   ```bash
   mkdir -p .local
   ```

   ```bash
   cp signing.example.json .local/signing.json
   ```

   ```bash
   cp device.example.json .local/device.json
   ```

   On Windows, create the `.local` folder and copy the two files in File Explorer instead.

   Edit `.local/signing.json` and set `sdk_path` to your Tizen Studio folder. Leave `profile` for now. Edit `.local/device.json` and set `host` to the **TV's IP address**.

4. Test the connection:

   ```bash
   npm run tv:info
   ```

   You should see the TV's capabilities, including `platform_version`. On this firmware family, expect Tizen **9.0** and **armv7**.

5. List the apps installed on your TV:

   ```bash
   npm run tv:apps
   ```

**If the connection fails:**

| Symptom | Fix |
| --- | --- |
| `failed to connect` or `connection refused` | Check that Host PC IP on the TV matches the computer's current IP. Power-cycle at the wall again. Make sure both devices are on the same network and not on a guest Wi-Fi. |
| Worked yesterday, fails today | An IP address changed (update `.local/device.json` or the TV's Host PC IP), or the TV is in deep standby. Power-cycle at the wall. |
| Tizen Studio seems to break the connection | A CleanFrame contributor found that Tizen Studio or Certificate Manager can replace the running `sdb` server. Close them, then run `npm run tv:info` again. |

Never open a router port to fix a connection problem. Developer access belongs on your home network only.

## Stage 4 — Create your signing certificates

The TV only installs apps signed by **your** certificates. This part is a one-off.

1. In Tizen Studio, open **Tools → Certificate Manager**.
2. Select **+**, choose **Samsung**, then **TV**. Name the profile, for example `SerifHome`.
3. **Author certificate:** choose to create a new one. Enter a name and a password, then sign in with your Samsung account when the browser opens. **Back up the author certificate file and its password.** You need them to update the app later.
4. **Distributor certificate:** keep the **Public** privilege. Add your TV's **DUID**. If `sdb` is connected, the TV appears in the list automatically. Otherwise, Samsung lists it under **Settings → Support → Contact Samsung → Unique Device ID**; menu wording varies. Type it in carefully. A serial number or model code is a different value.
5. Finish the wizard and check that the profile lists both certificates.
6. Put the profile name in `.local/signing.json`:

   ```json
   { "sdk_path": "~/tizen-studio", "profile": "SerifHome" }
   ```

7. Open **Tools → Device Manager**, right-click your TV and choose **Permit to install applications**. This sends your certificate's device profile to the TV.

Never put passwords in `.local/signing.json`. If your profile doesn't save passwords, the packager asks for them in the terminal.

## Stage 5 — Build, install and open Serif Home

1. **Optional:** preview the launcher on your computer first:

   ```bash
   npm run dev
   ```

   Open <http://127.0.0.1:4795/> and use the arrow keys, Enter (OK) and Escape (Back).

2. Build and sign:

   ```bash
   npm run package
   ```

   This creates `dist/SerifHome-signed.wgt`.

3. Install it. The TV screen may change briefly while this runs.

   ```bash
   npm run tv:install
   ```

   It should finish with `Installed yw2bHzEqX6.SerifHome`. This uses the same install route that worked on CleanFrame's TV with this firmware: on that TV, `sdb install` alone only uploaded the file without installing it.

4. Open it:

   ```bash
   npm run tv:launch
   ```

   Serif Home also now appears in the TV's **Apps** list, so you can open it with the remote.

**If installation fails:**

| Message | Likely cause |
| --- | --- |
| Signature or certificate error | The distributor certificate doesn't include this TV's DUID, or **Permit to install applications** wasn't done. |
| `did not confirm the installation` | Run `npm run tv:apps SerifHome` to check. Power-cycle the TV and try again. |
| `does not match your app ID` | Run `npm run package` again before installing. |

## Stage 6 — Check it on the TV

Go through this list with the remote, and note anything that looks wrong:

- [ ] Clock, date and app tiles appear. Tiles show each app's real icon from the TV.
- [ ] Left/Right moves along the apps. **OK** opens one, and the app starts.
- [ ] The remote's **Home** button takes you to Samsung's Smart Hub. From there, Serif Home is in **Apps**.
- [ ] **Up** reaches All apps and Settings. **All apps** lists your installed apps.
- [ ] **Settings → Samsung Smart Hub** and **Settings → TV settings** open the right screens. These IDs come from CleanFrame's TV and haven't been confirmed on a Serif yet.
- [ ] **Ambient** appears at the top right if the TV's Ambient Mode app was found. If it's missing, see below.
- [ ] Changes to background, clock and Home apps survive turning the TV off and on.

### Ambient Mode

The Serif has **Ambient Mode+**, not The Frame's Art Mode. Serif Home searches the installed-app list for an app with "ambient" in its ID or name. If the Ambient button doesn't appear, look for the ID:

```bash
npm run tv:apps ambient
```

Add the ID to `AMBIENT_IDS` in `app/catalog.js`, then run `npm run package` and `npm run tv:install` again.

## Stage 7 — Make it your everyday screen (low risk)

A normal app can't take over the remote's **Home** button; Samsung reserves that. These settings get you most of the way there without any risk:

1. **Settings → All Settings → General & Privacy → Start Screen Option** (wording varies by firmware). Turn **Start with Smart Hub Home** off and **Autorun Last App** on.
2. Open Serif Home last before you turn the TV off. It should then be what you see when the TV wakes.
3. In Smart Hub's **Apps**, move Serif Home to the first position so it's always one press away.

CleanFrame found that **Autorun Last App** resumes whichever app you used last. If you turn the TV off while Netflix is open, Netflix comes back. Fully replacing the Home button is a separate, higher-risk experiment, described in [native-home.md](native-home.md).

## Updating, removing and undoing

- **Update:** edit the code, then run `npm run package` and `npm run tv:install` again. Keep the same author certificate and app ID, or the TV treats it as a different app.
- **Remove:** run `npm run tv:uninstall`, or on the TV go to **Apps → Settings (gear) → Serif Home → Delete**.
- **Developer Mode:** you can switch it off again in **Apps → 12345** when you're done. If Serif Home stops opening afterwards, switch Developer Mode back on.
- **Firmware updates:** they don't normally affect an installed app. If one does, run `npm run tv:info` to check the connection, then reinstall.

## Sources

- [Samsung: connect a TV for development](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html)
- [Samsung: create certificates](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html)
- [Samsung: command-line interface](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/command-line-interface.html)
- [CleanFrame setup guide and TV status](https://github.com/nthnclrk/CleanFrame/blob/main/docs/agent-tv-setup-guide.md)
